import { useCallback, useRef } from 'react';
import { Arc, Ellipse, Group, Line, Rect, RegularPolygon, Text, Image as KonvaImage, Circle } from 'react-konva';
import { useState, useEffect as ReactUseEffect } from 'react';
import { Html } from 'react-konva-utils';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape } from '../../domain/document';
import { distanceBetween, findAlignmentGuides, isCenteredShape, nodePosition, snapOpeningOrigin, snapShapeOrigin, snapWallOrigin } from '../../domain/geometry';
import { useDrawingStore, getActivePage } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';
import { WALL_DEFINITIONS } from '../../domain/walls';
import { formatMetric, formatNumber, mmToInches } from '../../domain/units';
import { formatMmToUnit } from '../../utils/units';
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
  const drawingScale = useEditorStore((state) => state.drawingScale);
  const measurementUnit = useEditorStore((state) => state.measurementUnit);
  const moving = useRef<Shape[]>([]);
  const ref = useCallback((node: ShapeNode | null) => register(shape.id, node), [register, shape.id]);
  function select(event: KonvaEventObject<MouseEvent | TouchEvent | DragEvent>) {
    if (!selectable) return;
    event.cancelBubble = true;
    if (event.evt && typeof event.evt.stopPropagation === 'function') {
      event.evt.stopPropagation();
    }
    const multi = Boolean(event.evt && (event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey));
    if (!multi && useEditorStore.getState().selectedIds.includes(shape.id)) return;
    useEditorStore.getState().select(shape.id, multi);
  }
  function dragStart(event: KonvaEventObject<DragEvent>) {
    event.cancelBubble = true;
    const editor = useEditorStore.getState();
    moving.current = editor.activeTool === 'move' || editor.selectedIds.length > 1
      ? getActivePage(useDrawingStore.getState().document).shapes.filter(item => editor.selectedIds.includes(item.id)) : [];
  }
  function moveSelection(node: Konva.Node, raw: { x: number; y: number }, commit: boolean): boolean {
    if (!moving.current.length) return false;
    const lead = moving.current.find(item => item.id === shape.id);
    if (!lead) return false;
    const dx = raw.x - lead.x;
    const dy = raw.y - lead.y;
    for (const item of moving.current) {
      const target = node.getStage()?.findOne((candidate: Konva.Node) => candidate.id() === item.id);
      target?.position(nodePosition({ ...item, x: item.x + dx, y: item.y + dy }));
    }
    if (commit) {
      try { useDrawingStore.getState().translateShapes(moving.current.map(item => item.id), dx, dy); }
      catch (error) {
        for (const item of moving.current) node.getStage()?.findOne((candidate: Konva.Node) => candidate.id() === item.id)?.position(nodePosition(item));
        useEditorStore.getState().reportError(error);
      }
      moving.current = [];
    } else {
      useEditorStore.getState().setProximityShape({ ...lead, ...raw });
      useEditorStore.getState().setAlignmentGuides([]);
      useEditorStore.getState().setSnapStatus('Move only');
    }
    return true;
  }
  function dragEnd(event: KonvaEventObject<DragEvent>) {
    event.cancelBubble = true;
    useEditorStore.getState().setAlignmentGuides([]);
    useEditorStore.getState().setProximityShape(null);
    const node = event.target;
    const offset = isCenteredShape(shape) ? { x: shape.width / 2, y: shape.height / 2 } : { x: 0, y: 0 };
    const raw = { x: node.x() - offset.x, y: node.y() - offset.y };
    if (moveSelection(node, raw, true)) return;
    const editorScale = useEditorStore.getState().scale;
    const isOpening = shape.type === 'door' || shape.type === 'window';
    const snapResult = event.evt.altKey
      ? { point: raw, kind: 'free' as const }
      : shape.type === 'wall'
        ? snapWallOrigin(raw, shape, getActivePage(useDrawingStore.getState().document).shapes, gridMm, 16 / editorScale)
        : isOpening
          ? snapOpeningOrigin(raw, shape, getActivePage(useDrawingStore.getState().document).shapes, gridMm, 16 / editorScale)
          : snapShapeOrigin(raw, shape, getActivePage(useDrawingStore.getState().document).shapes, gridMm, 16 / editorScale);
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
    if (moveSelection(node, raw, false)) return;
    if (event.evt.altKey) {
      useEditorStore.getState().setSnapStatus('Free placement (Alt)');
      useEditorStore.getState().setAlignmentGuides([]);
      useEditorStore.getState().setProximityShape({ ...shape, ...raw, rotation: node.rotation() });
      return;
    }
    const editorScale = useEditorStore.getState().scale;
    const shapes = getActivePage(useDrawingStore.getState().document).shapes;
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
    ref, id: shape.id, ...nodePosition(shape), rotation: shape.rotation ?? 0, draggable: selectable,
    // Select before Konva decides whether pointer movement is a click or a drag.
    onMouseDown: select, onTouchStart: select,
    onDragStart: dragStart, onDragMove: dragMove, onDragEnd: dragEnd,
  };
  const renderFill = shape.fillColor || shape.fill || 'transparent';
  const renderStroke = shape.strokeColor || shape.stroke || undefined;
  const props = { ...nodeProps, fill: renderFill === 'transparent' ? undefined : renderFill, stroke: selected ? '#1d4ed8' : renderStroke, strokeWidth: selected ? Math.max(2 / scale, shape.strokeWidth ?? 0) : (shape.strokeWidth ?? 0), opacity: shape.opacity ?? 1, shadowColor: shape.shadowColor, shadowBlur: shape.shadowBlur ?? 0, shadowOffsetX: shape.shadowOffsetX ?? 0, shadowOffsetY: shape.shadowOffsetY ?? 0 };
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
      scaleX={shape.width / Math.min(shape.width, shape.height)} scaleY={shape.height / Math.min(shape.width, shape.height)}
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
      <Line points={points} stroke={selected ? '#1d4ed8' : (shape.strokeColor || shape.fillColor || shape.fill)}
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
  
  if (shape.type === 'group' && shape.groupChildren) {
    return <Group {...nodeProps} width={shape.width} height={shape.height}>
      {selected && (
        <Rect x={-4 / scale} y={-4 / scale} width={shape.width + 8 / scale} height={shape.height + 8 / scale} stroke="#1d4ed8" strokeWidth={1.5 / scale} dash={[4 / scale, 4 / scale]} listening={false} />
      )}
      {shape.groupChildren.map((child) => (
        <ShapeView key={child.id} shape={child} scale={scale} unit={unit} gridMm={gridMm} register={register} selectable={false} selected={false} />
      ))}
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
    const label = `${formatMmToUnit(length, measurementUnit, drawingScale)} ${measurementUnit}`;
    
    let nx = 0;
    let ny = 1;
    if (start && end && length > 0) {
      nx = -(end.y - start.y) / length;
      ny = (end.x - start.x) / length;
    }
    const arrowLen = 15 / scale;
    const arrowWidth = 6 / scale;
    let dx = 0, dy = 0;
    if (length > 0) { dx = (end.x - start.x) / length; dy = (end.y - start.y) / length; }

    return <Group {...nodeProps} width={shape.width} height={shape.height}>
      <Line points={points} stroke={selected ? '#1d4ed8' : (shape.strokeColor || shape.fillColor || '#475569')} strokeWidth={shape.strokeWidth || (2 / scale)}
        lineCap="butt" hitStrokeWidth={20 / scale} />
      {start && end && <>
        <Line points={[
          start.x + dx * arrowLen + ny * arrowWidth, start.y + dy * arrowLen - nx * arrowWidth,
          start.x, start.y,
          start.x + dx * arrowLen - ny * arrowWidth, start.y + dy * arrowLen + nx * arrowWidth
        ]} stroke={selected ? '#1d4ed8' : (shape.strokeColor || shape.fillColor || '#475569')} strokeWidth={shape.strokeWidth || (2 / scale)} lineCap="round" lineJoin="round" />
        <Line points={[
          end.x - dx * arrowLen + ny * arrowWidth, end.y - dy * arrowLen - nx * arrowWidth,
          end.x, end.y,
          end.x - dx * arrowLen - ny * arrowWidth, end.y - dy * arrowLen + nx * arrowWidth
        ]} stroke={selected ? '#1d4ed8' : (shape.strokeColor || shape.fillColor || '#475569')} strokeWidth={shape.strokeWidth || (2 / scale)} lineCap="round" lineJoin="round" />
        <Text x={(start.x + end.x) / 2 + 8 / scale} y={(start.y + end.y) / 2 - 24 / scale}
          text={label} fontSize={(shape.fontSize || 16) / scale} fill={shape.fillColor || shape.fill || "#0f172a"} padding={4 / scale} listening={false} />
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
  
  
  if (shape.type === 'image') {
    const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
    ReactUseEffect(() => {
      if (shape.imageUrl) {
        const img = new window.Image();
        img.src = shape.imageUrl;
        img.onload = () => setImageObj(img);
      }
    }, [shape.imageUrl]);

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
      {imageObj && (
        <KonvaImage
          image={imageObj}
          width={shape.width}
          height={shape.height}
          opacity={shape.opacity ?? 1}
          shadowColor={shape.shadowColor}
          shadowBlur={shape.shadowBlur ?? 0}
          shadowOffsetX={shape.shadowOffsetX ?? 0}
          shadowOffsetY={shape.shadowOffsetY ?? 0}
        />
      )}
    </Group>;
  }
  if (shape.type === 'spreadsheet') {
    const data = shape.spreadsheetData || [['', '', ''], ['', '', ''], ['', '', '']];
    const updateCell = (r: number, c: number, value: string) => {
      const newData = data.map((row, i) => i === r ? row.map((cell, j) => j === c ? value : cell) : row);
      useDrawingStore.getState().updateGeometry(shape.id, {}, { spreadsheetData: newData });
    };
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
      <Html divProps={{ style: { width: shape.width + 'px', height: shape.height + 'px' } }}>
        <div style={{ width: '100%', height: '100%', background: shape.fillColor || shape.fill || 'white', border: `1px solid ${shape.strokeColor || '#ccc'}`, overflow: 'auto', pointerEvents: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ border: '1px solid #ddd', padding: 0 }}>
                      <input 
                        type="text" 
                        value={cell} 
                        onChange={(e) => updateCell(i, j, e.target.value)}
                        onPointerDown={(e) => e.stopPropagation()} 
                        onMouseDown={(e) => e.stopPropagation()} 
                        style={{ width: '100%', border: 'none', padding: '4px', outline: 'none', background: 'transparent' }} 
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Html>
    </Group>;
  }
    
  if (shape.type === 'chart') {
    const rawData = shape.chartData || 'Item 1: 10, Item 2: 20, Item 3: 15';
    const pairs = rawData.split(',').map(s => s.trim()).filter(Boolean);
    const data = pairs.map(p => {
      const parts = p.split(':');
      return { label: parts[0] || '?', value: parseFloat(parts[1]) || 0 };
    });
    
    const maxVal = Math.max(...data.map(d => d.value), 1);
    const totalVal = data.reduce((sum, d) => sum + d.value, 0) || 1;
    
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    
    return <Group {...nodeProps} width={shape.width} height={shape.height}>
      {selected && (
        <Rect x={-4 / scale} y={-4 / scale} width={shape.width + 8 / scale} height={shape.height + 8 / scale} stroke="#1d4ed8" strokeWidth={1.5 / scale} dash={[4 / scale, 4 / scale]} listening={false} />
      )}
      <Rect width={shape.width} height={shape.height} fill={shape.fillColor || '#ffffff'} stroke={shape.strokeColor || '#e2e8f0'} strokeWidth={shape.strokeWidth || (1 / scale)} />
      
      {shape.chartType === 'pie' ? (
        <Group x={shape.width / 2} y={shape.height / 2}>
          {data.map((d, i) => {
            const startAngle = i === 0 ? 0 : data.slice(0, i).reduce((sum, d) => sum + d.value, 0) / totalVal * 360;
            const angle = (d.value / totalVal) * 360;
            const radius = Math.min(shape.width, shape.height) * 0.4;
            return (
              <Group key={i}>
                <Arc innerRadius={0} outerRadius={radius} angle={angle} rotation={startAngle} fill={colors[i % colors.length]} stroke="#fff" strokeWidth={1/scale} />
              </Group>
            );
          })}
        </Group>
      ) : (
        <Group x={shape.width * 0.1} y={shape.height * 0.1}>
          {data.map((d, i) => {
            const chartW = shape.width * 0.8;
            const chartH = shape.height * 0.8;
            const barW = chartW / data.length - (4 / scale);
            const barH = (d.value / maxVal) * chartH;
            return (
              <Group key={i} x={i * (chartW / data.length)}>
                <Rect y={chartH - barH} width={barW} height={barH} fill={colors[i % colors.length]} />
                <Text y={chartH + (4 / scale)} width={barW} text={d.label} fontSize={12 / scale} align="center" fill="#475569" />
              </Group>
            );
          })}
        </Group>
      )}
    </Group>;
  }

  if (shape.type === 'callout') {
    const text = shape.text || 'Callout text';
    const px = shape.points?.[0] ?? -50 / scale;
    const py = shape.points?.[1] ?? -50 / scale;
    const updatePointer = (e: any) => {
      const node = e.target;
      useDrawingStore.getState().updateGeometry(shape.id, {}, { points: [node.x(), node.y()] });
    };

    return <Group {...nodeProps} width={shape.width} height={shape.height}>
      {selected && (
        <Rect x={-4 / scale} y={-4 / scale} width={shape.width + 8 / scale} height={shape.height + 8 / scale} stroke="#1d4ed8" strokeWidth={1.5 / scale} dash={[4 / scale, 4 / scale]} listening={false} />
      )}
      <Line points={[shape.width / 2, shape.height / 2, px, py]} stroke={shape.strokeColor || shape.fillColor || '#0f172a'} strokeWidth={shape.strokeWidth || (2 / scale)} />
      <Rect width={shape.width} height={shape.height} fill={shape.fillColor || '#ffffff'} stroke={shape.strokeColor || '#0f172a'} strokeWidth={shape.strokeWidth || (2 / scale)} cornerRadius={4 / scale} />
      <Text width={shape.width} height={shape.height} text={text} fontSize={(shape.fontSize || 16) / scale} fill={shape.fillColor || "#0f172a"} align="center" verticalAlign="middle" padding={8 / scale} />
      {selected && (
        <Circle x={px} y={py} radius={6 / scale} fill="#ffffff" stroke="#1d4ed8" strokeWidth={2 / scale} draggable onDragMove={updatePointer} onDragEnd={updatePointer} />
      )}
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
