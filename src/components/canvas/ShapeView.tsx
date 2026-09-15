import { useCallback } from 'react';
import { Arc, Ellipse, Group, Line, Rect, RegularPolygon, Text } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape } from '../../domain/document';
import { distanceBetween, isCenteredShape, nodePosition, snapShapeOrigin, snapWallOrigin } from '../../domain/geometry';
import { useDrawingStore } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';
import { WALL_DEFINITIONS } from '../../domain/walls';
import { formatMetric, formatNumber, mmToInches } from '../../domain/units';
import { FurnitureArtwork } from './FurnitureArtwork';

export type ShapeNode = Konva.Node;
interface Props {
  shape: Shape;
  gridMm: number;
  unit: 'mm' | 'cm';
  selectable: boolean;
  selected: boolean;
  scale: number;
  register: (id: string, node: ShapeNode | null) => void;
}

function offsetLine(points: number[], offset: number): number[] {
  if (points.length < 4) return points;
  const dx = points[2] - points[0];
  const dy = points[3] - points[1];
  const length = Math.hypot(dx, dy);
  if (length === 0) return points;
  const normalX = -dy / length * offset;
  const normalY = dx / length * offset;
  return points.map((value, index) => value + (index % 2 === 0 ? normalX : normalY));
}
export function ShapeView({ shape, gridMm, unit, selectable, selected, scale, register }: Props) {
  const ref = useCallback((node: ShapeNode | null) => register(shape.id, node), [register, shape.id]);
  function select(event: KonvaEventObject<MouseEvent | TouchEvent | DragEvent>) {
    if (!selectable) return;
    event.cancelBubble = true;
    useEditorStore.getState().select(shape.id);
  }
  function dragEnd(event: KonvaEventObject<DragEvent>) {
    event.cancelBubble = true;
    const node = event.target;
    const offset = isCenteredShape(shape) ? { x: shape.width / 2, y: shape.height / 2 } : { x: 0, y: 0 };
    const raw = { x: node.x() - offset.x, y: node.y() - offset.y };
    const editorScale = useEditorStore.getState().scale;
    const snapResult = event.evt.altKey
      ? { point: raw, kind: 'free' as const }
      : shape.type === 'wall'
        ? snapWallOrigin(raw, shape, useDrawingStore.getState().document.shapes, gridMm, 16 / editorScale)
        : snapShapeOrigin(raw, shape, useDrawingStore.getState().document.shapes, gridMm, 16 / editorScale);
    const next = { ...shape, ...snapResult.point };
    try {
      useDrawingStore.getState().updateBounds(shape.id, { x: next.x, y: next.y, width: shape.width, height: shape.height });
      node.position(nodePosition(next));
      useEditorStore.getState().setSnapStatus(snapResult.kind === 'free' ? 'Free placement (Alt)' : snapResult.kind === 'wall' ? 'Wall join snap' : snapResult.kind === 'object' ? 'Object snap' : 'Grid snap');
    } catch (error) {
      node.position(nodePosition(shape));
      useEditorStore.getState().reportError(error);
    }
  }
  function dragMove(event: KonvaEventObject<DragEvent>) {
    event.cancelBubble = true;
    const node = event.target;
    const offset = isCenteredShape(shape) ? { x: shape.width / 2, y: shape.height / 2 } : { x: 0, y: 0 };
    const raw = { x: node.x() - offset.x, y: node.y() - offset.y };
    if (event.evt.altKey) {
      useEditorStore.getState().setSnapStatus('Free placement (Alt)');
      return;
    }
    const editorScale = useEditorStore.getState().scale;
    const snapResult = shape.type === 'wall'
      ? snapWallOrigin(raw, shape, useDrawingStore.getState().document.shapes, gridMm, 16 / editorScale)
      : snapShapeOrigin(raw, shape, useDrawingStore.getState().document.shapes, gridMm, 16 / editorScale);
    node.position(nodePosition({ ...shape, ...snapResult.point }));
    useEditorStore.getState().setSnapStatus(snapResult.kind === 'wall' ? 'Wall join snap' : snapResult.kind === 'object' ? 'Object snap' : 'Grid snap');
  }
  const nodeProps = {
    ref, ...nodePosition(shape), rotation: shape.rotation ?? 0, draggable: selectable,
    // Select before Konva decides whether pointer movement is a click or a drag.
    onMouseDown: select, onTouchStart: select, onDragStart: select,
    onClick: select, onTap: select, onDragMove: dragMove, onDragEnd: dragEnd,
  };
  const props = { ...nodeProps, fill: shape.fill, stroke: selected ? '#1d4ed8' : undefined, strokeWidth: selected ? 2 / scale : 0 };
  if (shape.type === 'circle' || shape.type === 'ellipse') {
    return <Ellipse {...props} radiusX={shape.width / 2} radiusY={shape.height / 2} />;
  }
  if (shape.type === 'triangle') {
    return <RegularPolygon {...props} sides={3} radius={Math.min(shape.width, shape.height) / 2}
      scaleX={shape.width / Math.min(shape.width, shape.height)} scaleY={shape.height / Math.min(shape.width, shape.height)} />;
  }
  if (shape.type === 'arc') {
    return <Arc {...props} innerRadius={0} outerRadius={Math.min(shape.width, shape.height) / 2}
      angle={(shape.endAngle ?? 180) - (shape.startAngle ?? 0)} rotation={(shape.rotation ?? 0) + (shape.startAngle ?? 0)} />;
  }
  if (shape.type === 'line' || shape.type === 'polyline' || shape.type === 'polygon') {
    const points = shape.points?.flatMap((point) => [point.x, point.y]) ?? [];
    return <Line {...props} points={points} closed={shape.type === 'polygon'}
      fill={shape.type === 'polygon' ? shape.fill : undefined}
      stroke={selected ? '#1d4ed8' : shape.fill} strokeWidth={Math.max(6 / scale, 2)}
      lineCap="round" lineJoin="round" hitStrokeWidth={20 / scale} />;
  }
  if (shape.type === 'wall') {
    const points = shape.points?.flatMap((point) => [point.x, point.y]) ?? [];
    const thickness = shape.wallThicknessMm ?? 101.6;
    const pattern = WALL_DEFINITIONS[shape.wallType ?? 'interior_partition'].pattern;
    const markerStroke = '#ffffffb3';
    return <Group {...nodeProps} width={shape.width} height={shape.height}>
      <Line points={points} stroke={selected ? '#1d4ed8' : shape.fill}
        strokeWidth={thickness} lineCap="butt" lineJoin="miter"
        hitStrokeWidth={Math.max(20 / scale, thickness)} />
      {!selected && pattern === 'masonry-joints' && <Line points={points} listening={false} stroke={markerStroke}
        strokeWidth={Math.max(1 / scale, thickness * 0.035)} dash={[thickness * 0.55, thickness * 0.22]} />}
      {!selected && pattern === 'concrete-stipple' && <Line points={points} listening={false} stroke={markerStroke}
        strokeWidth={Math.max(1 / scale, thickness * 0.045)} dash={[Math.max(1 / scale, thickness * 0.06), thickness * 0.3]} lineCap="round" />}
      {!selected && pattern === 'double-line' && <>
        <Line points={offsetLine(points, thickness * 0.18)} listening={false} stroke={markerStroke} strokeWidth={Math.max(1 / scale, thickness * 0.025)} />
        <Line points={offsetLine(points, -thickness * 0.18)} listening={false} stroke={markerStroke} strokeWidth={Math.max(1 / scale, thickness * 0.025)} />
      </>}
      {!selected && pattern === 'dash-line' && <Line points={points} listening={false} stroke={markerStroke}
        strokeWidth={Math.max(1 / scale, thickness * 0.035)} dash={[thickness * 0.18, thickness * 0.12]} />}
    </Group>;
  }
  if (shape.type === 'measurement') {
    const points = shape.points?.flatMap((point) => [point.x, point.y]) ?? [];
    const start = shape.points?.[0];
    const end = shape.points?.[1];
    const length = start && end ? distanceBetween(start, end) : 0;
    const label = `${formatMetric(length, unit)} · ${formatNumber(mmToInches(length))} in`;
    return <>
      <Line {...props} points={points} stroke={selected ? '#1d4ed8' : '#dc2626'} strokeWidth={2 / scale}
        dash={[8 / scale, 5 / scale]} lineCap="round" hitStrokeWidth={20 / scale} />
      {start && end && <Text x={shape.x + (start.x + end.x) / 2 + 8 / scale} y={shape.y + (start.y + end.y) / 2 - 24 / scale}
        text={label} fontSize={16 / scale} fill="#991b1b" padding={4 / scale} listening={false} />}
    </>;
  }
  if (shape.type === 'furniture') {
    return <Group {...nodeProps} width={shape.width} height={shape.height}>
      <FurnitureArtwork shape={shape} selected={selected} scale={scale} />
    </Group>;
  }
  if (shape.type === 'text') {
    return <Text {...props} width={shape.width} height={shape.height}
      strokeEnabled={false}
      text={shape.text ?? ''} fontFamily="sans-serif" fontSize={Math.min(130, shape.height * 0.65)}
      verticalAlign="middle" />;
  }
  return <Rect {...props} width={shape.width} height={shape.height} />;
}
