import { useCallback } from 'react';
import { Arc, Ellipse, Group, Line, Rect, RegularPolygon, Text } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape } from '../../domain/document';
import { distanceBetween, findAlignmentGuides, isCenteredShape, nodePosition, snapOpeningOrigin, snapShapeOrigin, snapWallOrigin } from '../../domain/geometry';
import { useDrawingStore } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';
import { WALL_DEFINITIONS } from '../../domain/walls';
import { formatMetric, formatNumber, mmToInches } from '../../domain/units';
import { FurnitureArtwork } from './FurnitureArtwork';
import { DoorArtwork } from './DoorArtwork';

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
    if (event.evt && typeof event.evt.stopPropagation === 'function') {
      event.evt.stopPropagation();
    }
    const multi = Boolean(event.evt && (event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey));
    useEditorStore.getState().select(shape.id, multi);
  }
  function dragEnd(event: KonvaEventObject<DragEvent>) {
    event.cancelBubble = true;
    useEditorStore.getState().setAlignmentGuides([]);
    useEditorStore.getState().setProximityShape(null);
    const node = event.target;
    const offset = isCenteredShape(shape) ? { x: shape.width / 2, y: shape.height / 2 } : { x: 0, y: 0 };
    const raw = { x: node.x() - offset.x, y: node.y() - offset.y };
    const editorScale = useEditorStore.getState().scale;
    const isOpening = shape.type === 'door' || shape.type === 'window';
    const snapResult = event.evt.altKey
      ? { point: raw, kind: 'free' as const }
      : shape.type === 'wall'
        ? snapWallOrigin(raw, shape, useDrawingStore.getState().document.shapes, gridMm, 16 / editorScale)
        : isOpening
          ? snapOpeningOrigin(raw, shape, useDrawingStore.getState().document.shapes, gridMm, 16 / editorScale)
          : snapShapeOrigin(raw, shape, useDrawingStore.getState().document.shapes, gridMm, 16 / editorScale);
    const rot = 'rotation' in snapResult && typeof snapResult.rotation === 'number' ? snapResult.rotation : undefined;
    const h = 'height' in snapResult && typeof snapResult.height === 'number' ? snapResult.height : undefined;
    const nextRotation = rot !== undefined ? rot : (shape.rotation ?? 0);
    const nextHeight = h !== undefined ? h : shape.height;
    const next = { ...shape, ...snapResult.point, height: nextHeight, rotation: nextRotation };
    try {
      useDrawingStore.getState().updateGeometry(shape.id, { x: next.x, y: next.y, width: shape.width, height: next.height }, { rotation: next.rotation });
      if (shape.type === 'wall') {
        useDrawingStore.getState().mergeWall(shape.id);
      }
      node.position(nodePosition(next));
      node.rotation(next.rotation);
      useEditorStore.getState().setSnapStatus(snapResult.kind === 'free' ? 'Free placement (Alt)' : snapResult.kind === 'wall' ? 'Wall join snap' : snapResult.kind === 'object' ? 'Object snap' : 'Grid snap');
    } catch (error) {
      node.position(nodePosition(shape));
      node.rotation(shape.rotation ?? 0);
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
      useEditorStore.getState().setAlignmentGuides([]);
      useEditorStore.getState().setProximityShape({ ...shape, ...raw, rotation: node.rotation() });
      return;
    }
    const editorScale = useEditorStore.getState().scale;
    const shapes = useDrawingStore.getState().document.shapes;
    const isOpening = shape.type === 'door' || shape.type === 'window';
    const snapResult = shape.type === 'wall'
      ? snapWallOrigin(raw, shape, shapes, gridMm, 16 / editorScale)
      : isOpening
        ? snapOpeningOrigin(raw, shape, shapes, gridMm, 16 / editorScale)
        : snapShapeOrigin(raw, shape, shapes, gridMm, 16 / editorScale);
    node.position(nodePosition({ ...shape, ...snapResult.point }));
    if ('rotation' in snapResult && typeof snapResult.rotation === 'number') {
      node.rotation(snapResult.rotation);
    }
    useEditorStore.getState().setProximityShape({
      ...shape, ...snapResult.point, rotation: node.rotation(),
      height: 'height' in snapResult && typeof snapResult.height === 'number' ? snapResult.height : shape.height,
    });
    useEditorStore.getState().setSnapStatus(snapResult.kind === 'wall' ? 'Wall join snap' : snapResult.kind === 'object' ? 'Object snap' : 'Grid snap');
    if (shape.type !== 'wall' && !isOpening) {
      const guides = findAlignmentGuides(snapResult.point, shape, shapes, 0.5);
      useEditorStore.getState().setAlignmentGuides(guides);
    } else {
      useEditorStore.getState().setAlignmentGuides([]);
    }
  }
  const nodeProps = {
    ref, ...nodePosition(shape), rotation: shape.rotation ?? 0, draggable: selectable,
    // Select before Konva decides whether pointer movement is a click or a drag.
    onMouseDown: select, onTouchStart: select,
    onDragMove: dragMove, onDragEnd: dragEnd,
  };
  const props = { ...nodeProps, fill: shape.fill, stroke: selected ? '#1d4ed8' : (shape.stroke ?? undefined), strokeWidth: selected ? Math.max(2 / scale, shape.strokeWidth ?? 0) : (shape.strokeWidth ?? 0) };
  if (shape.type === 'circle' || shape.type === 'ellipse') {
    return <Ellipse {...props} radiusX={shape.width / 2} radiusY={shape.height / 2} />;
  }
  if (shape.type === 'rectangle' || shape.type === 'square') {
    return <Rect {...props} width={shape.width} height={shape.height} />;
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
    const points = shape.points ?? [];
    return <Line {...props} points={points} closed={shape.type === 'polygon'}
      fill={shape.type === 'polygon' ? shape.fill : undefined}
      stroke={selected ? '#1d4ed8' : (shape.stroke ?? shape.fill)} strokeWidth={selected ? Math.max(6 / scale, shape.strokeWidth ?? 2) : (shape.strokeWidth ?? Math.max(6 / scale, 2))}
      lineCap="square" lineJoin="miter" hitStrokeWidth={Math.max(40 / scale, (shape.strokeWidth ?? 0) + 20 / scale)} />;
  }
  if (shape.type === 'wall') {
    const points = shape.points ?? [];
    const thickness = shape.wallThicknessMm ?? 101.6;
    const pattern = WALL_DEFINITIONS?.[shape.wallType ?? 'interior_partition']?.pattern || 'solid';
    const markerStroke = '#ffffffb3';
    return <Group {...nodeProps} width={shape.width} height={shape.height}>
      <Line points={points} stroke={selected ? '#1d4ed8' : shape.fill}
        strokeWidth={thickness} lineCap="butt" lineJoin="miter"
        hitStrokeWidth={Math.max(40 / scale, thickness + 40 / scale)} />
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
    const points = shape.points ?? [];
    const startX = points[0];
    const startY = points[1];
    const endX = points[2];
    const endY = points[3];
    const start = startX !== undefined && startY !== undefined ? { x: startX, y: startY } : undefined;
    const end = endX !== undefined && endY !== undefined ? { x: endX, y: endY } : undefined;
    const length = start && end ? distanceBetween(start, end) : 0;
    const label = `${formatMetric(length, unit)} · ${formatNumber(mmToInches(length))} in`;
    
    let nx = 0;
    let ny = 1;
    if (start && end && length > 0) {
      nx = -(end.y - start.y) / length;
      ny = (end.x - start.x) / length;
    }
    const tickLen = 10 / scale;

    return <Group {...nodeProps} width={shape.width} height={shape.height}>
      <Line points={points} stroke={selected ? '#1d4ed8' : '#dc2626'} strokeWidth={2 / scale}
        dash={[8 / scale, 5 / scale]} lineCap="butt" hitStrokeWidth={20 / scale} />
      {start && end && <>
        <Line points={[start.x - nx * tickLen, start.y - ny * tickLen, start.x + nx * tickLen, start.y + ny * tickLen]} stroke={selected ? '#1d4ed8' : '#dc2626'} strokeWidth={2 / scale} lineCap="round" />
        <Line points={[end.x - nx * tickLen, end.y - ny * tickLen, end.x + nx * tickLen, end.y + ny * tickLen]} stroke={selected ? '#1d4ed8' : '#dc2626'} strokeWidth={2 / scale} lineCap="round" />
        <Text x={(start.x + end.x) / 2 + 8 / scale} y={(start.y + end.y) / 2 - 24 / scale}
          text={label} fontSize={16 / scale} fill="#991b1b" padding={4 / scale} listening={false} />
      </>}
    </Group>;
  }
  if (shape.type === 'furniture') {
    return <Group {...nodeProps} width={shape.width} height={shape.height}>
      <FurnitureArtwork shape={shape} selected={selected} scale={scale} />
    </Group>;
  }
  if (shape.type === 'door' || shape.type === 'window') {
    return <Group {...nodeProps} width={shape.width} height={shape.height}>
      <DoorArtwork shape={shape} selected={selected} scale={scale} />
    </Group>;
  }
  if (shape.type === 'text') {
    const fontSize = shape.fontSize ?? Math.min(130, shape.height * 0.65);
    return <Group {...nodeProps} width={shape.width} height={shape.height}>
      {selected && (
        <Rect
          x={-4 / scale}
          y={-4 / scale}
          width={shape.width + 8 / scale}
          height={shape.height + 8 / scale}
          stroke="#1d4ed8"
          strokeWidth={1.5 / scale}
          dash={[4 / scale, 4 / scale]}
          listening={false}
        />
      )}
      <Text
        text={shape.text ?? 'Label'}
        width={shape.width}
        height={shape.height}
        fontSize={fontSize}
        fontFamily="sans-serif"
        fill={shape.fill || '#111827'}
        verticalAlign="middle"
        listening={true}
      />
    </Group>;
  }
  return <Rect {...props} width={shape.width} height={shape.height} />;
}
