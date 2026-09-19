import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Transformer, Rect } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { isProportionalShape, nodePosition, normalizePoints, screenToWorld, snapOpeningOrigin, snapToDrawingPointWithKind, snapToWallFace, snapToWallPoint, snapWallEndpoint } from '../../domain/geometry';
import { transformShape } from '../../domain/manipulation';
import type { Shape, ShapePoint } from '../../domain/document';
import { WALL_DEFINITIONS } from '../../domain/walls';
import { FURNITURE_DEFINITIONS } from '../../domain/furniture';
import { OPENING_DEFINITIONS } from '../../domain/doors';
import { useDrawingStore } from '../../store/useDrawingStore';
import { BASE_PIXELS_PER_MM, useEditorStore } from '../../store/useEditorStore';
import { DrawingGrid } from './DrawingGrid';
import { ShapeView } from './ShapeView';
import type { ShapeNode } from './ShapeView';
import { MeasurementOverlay } from './MeasurementOverlay';
import { AlignmentGuides } from './AlignmentGuides';
import { ProximityGuides } from './ProximityGuides';
import { registerStage } from '../../services/projectFiles';

function shapeLayerOrder(shape: Shape): number {
  if (shape.type === 'door' || shape.type === 'window') return 1;
  if (shape.type === 'furniture') return 2;
  if (shape.type === 'text' || shape.type === 'measurement') return 3;
  return 0;
}

export function DrawingCanvas() {
  const container = useRef<HTMLDivElement | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const nodes = useRef(new Map<string, ShapeNode>());
  const transformStart = useRef(new Map<string, { shape: Shape; scaleX: number; scaleY: number }>());
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [draft, setDraft] = useState<{ type: 'line' | 'polyline' | 'polygon' | 'wall'; points: ShapePoint[]; pointer: ShapePoint | null } | null>(null);
  const [dragDraft, setDragDraft] = useState<{ start: ShapePoint; current: ShapePoint } | null>(null);
  const [measurement, setMeasurement] = useState<{ start: ShapePoint; pointer: ShapePoint | null } | null>(null);
  const document = useDrawingStore((state) => state.document);
  const activeTool = useEditorStore((state) => state.activeTool);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const scale = useEditorStore((state) => state.scale);
  const position = useEditorStore((state) => state.position);
  const wallDefaults = useEditorStore((state) => state.wallDefaults);
  const alignmentGuides = useEditorStore((state) => state.alignmentGuides);
  const selectedShape = document.shapes.find((shape) => shape.id === selectedIds[0]);
  const register = useCallback((id: string, node: ShapeNode | null) => {
    if (!node) {
      nodes.current.delete(id);
      return;
    }
    nodes.current.set(id, node);
    // react-konva creates child nodes after React has committed selection state.
    // Attaching here makes a just-created or just-selected shape deterministic.
    const editor = useEditorStore.getState();
    if ((editor.activeTool === 'select' || editor.activeTool === 'move') && editor.selectedIds.includes(id)) {
      const selectedNodes = editor.selectedIds.map(selectedId => nodes.current.get(selectedId)).filter(Boolean) as Konva.Node[];
      transformerRef.current?.nodes(selectedNodes);
      transformerRef.current?.getLayer()?.batchDraw();
    }
  }, []);

  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.max(1, entry.contentRect.width), height: Math.max(1, entry.contentRect.height) });
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const selectedNodes = activeTool === 'select' || activeTool === 'move'
      ? selectedIds.map(id => nodes.current.get(id)).filter(Boolean) as Konva.Node[]
      : [];
    transformerRef.current?.nodes(selectedNodes);
    transformerRef.current?.getLayer()?.batchDraw();
  }, [selectedIds, activeTool, document.shapes]);

  const activeDraft = draft?.type === activeTool ? draft : null;

  function cancelDraft() {
    setDraft(null);
    useEditorStore.getState().setSnapStatus(null);
  }

  function snapStatus(kind: string) {
    return kind === 'free' ? 'Free placement (Alt)' : kind === 'wall' ? 'Wall join snap' : kind === 'object' ? 'Object snap' : 'Grid snap';
  }

  const commitPath = useCallback((type: 'line' | 'polyline' | 'polygon' | 'wall', worldPoints: ShapePoint[]) => {
    try {
      // A double-click first produces an ordinary click. Remove its repeated
      // endpoint before storing the path so it never creates a zero-length leg.
      const points = worldPoints.filter((point, index) => {
        const previous = worldPoints[index - 1];
        return !previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 0.000001;
      });
      const minimumPoints = type === 'polygon' ? 3 : 2;
      if (points.length < minimumPoints) return;
      const normalized = normalizePoints(points);
      useDrawingStore.getState().addShape({
        type, ...normalized.bounds, points: normalized.points.flatMap(p => [p.x, p.y]),
        fill: type === 'polygon' ? '#93c5fd' : type === 'wall' ? WALL_DEFINITIONS?.[wallDefaults.wallType]?.color || '#334155' : '#1d4ed8',
        ...(type === 'wall' ? wallDefaults : {}),
      });
      const added = useDrawingStore.getState().document.shapes.at(-1);
      setDraft(null);
      if (added && type === 'wall') {
        useDrawingStore.getState().mergeWall(added.id);
      }
      useEditorStore.getState().setTool('select');
      useEditorStore.getState().select(added?.id ?? null);
    } catch (error) { useEditorStore.getState().reportError(error); }
  }, [wallDefaults]);

  function handleDraftKey(key: string): boolean {
    if (!activeDraft) return false;
    if (key === 'Escape') {
      cancelDraft();
      return true;
    }
    if (key === 'Enter' && activeDraft.type !== 'line' && activeDraft.type !== 'wall' && activeDraft.points.length >= (activeDraft.type === 'polygon' ? 3 : 2)) {
      commitPath(activeDraft.type, activeDraft.points);
      return true;
    }
    return false;
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (activeTool === 'measure' && measurement && event.key === 'Escape') {
        setMeasurement(null);
        useEditorStore.getState().setSnapStatus(null);
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (!activeDraft || event.isComposing || window.document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') {
        cancelDraft();
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (event.key === 'Enter' && activeDraft.type !== 'line' && activeDraft.type !== 'wall' && activeDraft.points.length >= (activeDraft.type === 'polygon' ? 3 : 2)) {
        commitPath(activeDraft.type, activeDraft.points);
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [activeDraft, activeTool, commitPath, measurement]);

  function wheel(event: KonvaEventObject<WheelEvent>) {
    event.evt.preventDefault();
    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    const world = screenToWorld(pointer, position, scale);
    const direction = event.evt.ctrlKey ? -event.evt.deltaY : event.evt.deltaY;
    const nextScale = Math.min(BASE_PIXELS_PER_MM * 20, Math.max(BASE_PIXELS_PER_MM / 10, scale * (direction > 0 ? 1 / 1.08 : 1.08)));
    useEditorStore.getState().setViewport({ x: pointer.x - world.x * nextScale, y: pointer.y - world.y * nextScale }, nextScale);
  }
  function pan(event: KonvaEventObject<DragEvent>) {
    const stage = event.target.getStage();
    if (!stage || event.target !== stage) return;
    useEditorStore.getState().setViewport(stage.position(), scale);
  }
  function click(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = event.target.getStage();
    if (!stage) return;
    const editor = useEditorStore.getState();
    if (activeTool === 'select' || activeTool === 'move' || activeTool === 'text') {
      if (event.target === stage) editor.select(null);
      return;
    }
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const world = screenToWorld(pointer, position, scale);
    if (activeTool === 'measure') {
      let target = world;
      if (event.evt.shiftKey && measurement) {
        target = Math.abs(world.x - measurement.start.x) > Math.abs(world.y - measurement.start.y)
          ? { x: world.x, y: measurement.start.y }
          : { x: measurement.start.x, y: world.y };
      }
      const snapResult = event.evt.altKey
        ? { point: target, kind: 'free' as const }
        : snapToWallFace(target, document.shapes, document.gridMm, 16 / scale);
      
      let finalPoint = snapResult.point;
      if (event.evt.shiftKey && measurement) {
        finalPoint = Math.abs(world.x - measurement.start.x) > Math.abs(world.y - measurement.start.y)
          ? { x: finalPoint.x, y: measurement.start.y }
          : { x: measurement.start.x, y: finalPoint.y };
      }

      if (!measurement) {
        setMeasurement({ start: finalPoint, pointer: finalPoint });
      } else {
        try {
          const normalized = normalizePoints([measurement.start, finalPoint]);
          useDrawingStore.getState().addShape({ type: 'measurement', ...normalized.bounds, points: normalized.points.flatMap(p => [p.x, p.y]), fill: '#dc2626' });
          const added = useDrawingStore.getState().document.shapes.at(-1);
          setMeasurement(null);
          editor.setTool('select');
          editor.select(added?.id ?? null);
        } catch (error) { editor.reportError(error); }
      }
      editor.setSnapStatus(snapStatus(snapResult.kind));
      return;
    }
    let point: ShapePoint;
    let snapKind = 'free';
    
    if (activeTool === 'wall' && activeDraft?.type === 'wall' && event.evt.shiftKey && activeDraft.points.length > 0) {
      const start = activeDraft.points[activeDraft.points.length - 1];
      let pointerX = world.x;
      let pointerY = world.y;
      const startX = start.x;
      const startY = start.y;
      const dx = Math.abs(pointerX - startX);
      const dy = Math.abs(pointerY - startY);
      if (dx > dy) {
        pointerY = startY;
      } else {
        pointerX = startX;
      }
      point = { x: pointerX, y: pointerY };
    } else {
      const snapResult = event.evt.altKey
        ? { point: world, kind: 'free' as const }
        : activeTool === 'wall'
          ? activeDraft?.type === 'wall' && activeDraft.points[0]
            ? snapWallEndpoint(world, activeDraft.points[0], document.shapes, document.gridMm, 16 / scale)
            : snapToWallPoint(world, document.shapes, document.gridMm, 16 / scale)
          : snapToDrawingPointWithKind(world, document.shapes, document.gridMm, 16 / scale);
      point = snapResult.point;
      snapKind = snapResult.kind;
    }
    if (activeTool === 'line' || activeTool === 'polyline' || activeTool === 'polygon' || activeTool === 'wall') {
      if (!activeDraft) {
        setDraft({ type: activeTool, points: [point], pointer: point });
        editor.setSnapStatus(snapStatus(snapKind));
        return;
      }
      const points = [...activeDraft.points, point];
      if (activeTool === 'line' || activeTool === 'wall') {
        commitPath(activeTool, points);
        editor.setSnapStatus(snapStatus(snapKind));
      } else if ('detail' in event.evt && event.evt.detail >= 2 && points.length >= (activeTool === 'polygon' ? 3 : 2)) {
        // Unlike Konva's stage-level dblclick event, the native click count is
        // tied to this exact background click and cannot finish an earlier path.
        commitPath(activeTool, points);
        editor.setSnapStatus(snapStatus(snapKind));
      } else {
        setDraft({ ...activeDraft, points, pointer: point });
        editor.setSnapStatus(snapStatus(snapKind));
      }
      return;
    }
    try {
      const placedKind = editor.placedFurnitureKind;
      const furniture = activeTool === 'furniture' ? FURNITURE_DEFINITIONS[placedKind] : null;
      const doorDef = activeTool === 'door' ? OPENING_DEFINITIONS[editor.placedDoorType] : null;
      const windowDef = activeTool === 'window' ? OPENING_DEFINITIONS[editor.placedWindowType] : null;

      const isRoom = activeTool === 'rectangle';
      const width = furniture?.defaultWidthMm
        ?? doorDef?.defaultWidthMm
        ?? windowDef?.defaultWidthMm
        ?? (isRoom ? 3000 : 609.6);

      const height = furniture?.defaultHeightMm
        ?? doorDef?.defaultThicknessMm
        ?? windowDef?.defaultThicknessMm
        ?? (isRoom ? 3000 : 609.6);

      const fill = furniture?.color
        ?? doorDef?.color
        ?? windowDef?.color
        ?? (isRoom ? 'transparent' : activeTool === 'arc' ? '#1d4ed8' : activeTool === 'circle' || activeTool === 'ellipse' ? '#8b5cf6' : '#3b82f6');

      let placeX = point.x;
      let placeY = point.y;
      let placeHeight = height;
      let placeRotation = 0;
      let finalKind = snapKind;

      if ((activeTool === 'door' || activeTool === 'window') && !event.evt.altKey) {
        const openingSnap = snapOpeningOrigin(
          { x: point.x, y: point.y },
          { id: 'temp', type: activeTool, x: point.x, y: point.y, width, height, fill },
          document.shapes,
          document.gridMm,
          16 / scale,
        );
        placeX = openingSnap.point.x;
        placeY = openingSnap.point.y;
        if (openingSnap.rotation !== undefined) placeRotation = openingSnap.rotation;
        if (openingSnap.height !== undefined) placeHeight = openingSnap.height;
        finalKind = openingSnap.kind;
      }

      let payload: Omit<Shape, 'id'>;
      if (activeTool === 'rectangle') {
        payload = { type: 'rectangle', x: placeX, y: placeY, width, height: placeHeight, fill: 'transparent', stroke: '#334155', strokeWidth: 8 };
      } else {
        payload = {
          type: activeTool, x: placeX, y: placeY,
          width, height: placeHeight, fill,
          ...(placeRotation ? { rotation: placeRotation } : {}),
          ...(furniture ? { furnitureKind: placedKind } : {}),
          ...(doorDef ? { doorType: editor.placedDoorType, swingHinge: 'left', swingDirection: 'inside' } : {}),
          ...(windowDef ? { windowType: editor.placedWindowType } : {}),
          ...(activeTool === 'arc' ? { startAngle: 0, endAngle: 180 } : {}),
        };
      }

      useDrawingStore.getState().addShape(payload);
      editor.setTool('select');
      const added = useDrawingStore.getState().document.shapes.at(-1);
      editor.select(added?.id ?? null);
      editor.setSnapStatus(snapStatus(finalKind));
    } catch (error) { editor.reportError(error); }
  }
  function transformEnd() {
    if (activeTool !== 'select' || !transformStart.current.size) return;
    try {
      const changes = [...transformStart.current].map(([id, initial]) => {
        const node = nodes.current.get(id)!;
        return transformShape(initial.shape, { position: node.position(),
          scaleX: node.scaleX() / initial.scaleX, scaleY: node.scaleY() / initial.scaleY,
          rotation: node.rotation() - (initial.shape.type === 'arc' ? initial.shape.startAngle ?? 0 : 0) });
      });
      useDrawingStore.getState().replaceShapes(changes);
    } catch (error) {
      useEditorStore.getState().reportError(error);
    } finally {
      for (const [id] of transformStart.current) {
        const node = nodes.current.get(id);
        const shape = useDrawingStore.getState().document.shapes.find(item => item.id === id);
        if (!node || !shape) continue;
        const minimum = Math.min(shape.width, shape.height);
        node.scale(shape.type === 'triangle' || shape.type === 'arc' ? { x: shape.width / minimum, y: shape.height / minimum } : { x: 1, y: 1 });
        node.position(nodePosition(shape));
        node.rotation((shape.rotation ?? 0) + (shape.type === 'arc' ? shape.startAngle ?? 0 : 0));
      }
      transformStart.current.clear();
    }
    transformerRef.current?.forceUpdate();
  }
  function pointerMove(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    const world = screenToWorld(pointer, position, scale);
    if (activeTool === 'measure' && measurement) {
      let target = world;
      if (event.evt.shiftKey) {
        target = Math.abs(world.x - measurement.start.x) > Math.abs(world.y - measurement.start.y)
          ? { x: world.x, y: measurement.start.y }
          : { x: measurement.start.x, y: world.y };
      }
      let point = event.evt.altKey
        ? target
        : snapToWallFace(target, document.shapes, document.gridMm, 16 / scale).point;

      if (event.evt.shiftKey) {
        point = Math.abs(world.x - measurement.start.x) > Math.abs(world.y - measurement.start.y)
          ? { x: point.x, y: measurement.start.y }
          : { x: measurement.start.x, y: point.y };
      }
      setMeasurement((current) => current ? { ...current, pointer: point } : current);
      return;
    }
    if (!activeDraft) return;
    let point = world;
    if (activeDraft.type === 'wall' && event.evt.shiftKey && activeDraft.points.length > 0) {
      const start = activeDraft.points[activeDraft.points.length - 1];
      const dx = Math.abs(world.x - start.x);
      const dy = Math.abs(world.y - start.y);
      point = dx > dy
        ? { x: world.x, y: start.y }
        : { x: start.x, y: world.y };
    } else {
      point = event.evt.altKey
        ? world
        : activeDraft.type === 'wall'
          ? snapWallEndpoint(world, activeDraft.points[0], document.shapes, document.gridMm, 16 / scale).point
          : snapToDrawingPointWithKind(world, document.shapes, document.gridMm, 16 / scale).point;
    }

    if ((activeTool === 'square' || activeTool === 'rectangle') && dragDraft) {
      setDragDraft({ ...dragDraft, current: world });
      return;
    }
    setDraft((current) => current?.type === activeTool ? { ...current, pointer: point } : current);
  }
  const draftPoints = activeDraft ? [...activeDraft.points, ...(activeDraft.pointer ? [activeDraft.pointer] : [])].flatMap((point) => [point.x, point.y]) : [];
  const measurementEnd = measurement?.pointer;
  return <div className="drawing-canvas" ref={container} aria-label="Apartment drawing canvas"
    tabIndex={0} onPointerDownCapture={() => container.current?.focus({ preventScroll: true })}
    onKeyDownCapture={(event) => {
      if (activeTool === 'measure' && measurement && event.key === 'Escape') {
        setMeasurement(null);
        useEditorStore.getState().setSnapStatus(null);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (handleDraftKey(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }}>
    <Stage ref={(node) => registerStage(node)} width={size.width} height={size.height} x={position.x} y={position.y}
      scaleX={scale} scaleY={scale} draggable={activeTool === 'select' || activeTool === 'move'}
      onWheel={wheel} onClick={click} onTap={click}
      onMouseMove={pointerMove} onTouchMove={pointerMove} onDragMove={pan} onDragEnd={pan}
      onMouseDown={(event) => {
        if (activeTool === 'text') {
          const pointer = event.target.getStage()?.getPointerPosition();
          if (pointer) {
            const world = screenToWorld(pointer, position, scale);
            const snapResult = event.evt.altKey
              ? { point: world }
              : snapToDrawingPointWithKind(world, document.shapes, document.gridMm, 16 / scale);
            const placePoint = snapResult.point;
            useDrawingStore.getState().addShape({
              type: 'text',
              x: placePoint.x,
              y: placePoint.y,
              width: 800,
              height: 250,
              fill: '#111827',
              text: 'Label',
              fontSize: 120,
            });
            const added = useDrawingStore.getState().document.shapes.at(-1);
            useEditorStore.getState().setTool('select');
            useEditorStore.getState().select(added?.id ?? null);
          }
          return;
        }
        if (activeTool === 'square' || activeTool === 'rectangle') {
          const pointer = event.target.getStage()?.getPointerPosition();
          if (pointer) {
             const world = screenToWorld(pointer, position, scale);
             setDragDraft({ start: world, current: world });
          }
        }
      }}
      onTouchStart={(event) => {
        if (activeTool === 'text') {
          const pointer = event.target.getStage()?.getPointerPosition();
          if (pointer) {
            const world = screenToWorld(pointer, position, scale);
            const snapResult = snapToDrawingPointWithKind(world, document.shapes, document.gridMm, 16 / scale);
            const placePoint = snapResult.point;
            useDrawingStore.getState().addShape({
              type: 'text',
              x: placePoint.x,
              y: placePoint.y,
              width: 800,
              height: 250,
              fill: '#111827',
              text: 'Label',
              fontSize: 120,
            });
            const added = useDrawingStore.getState().document.shapes.at(-1);
            useEditorStore.getState().setTool('select');
            useEditorStore.getState().select(added?.id ?? null);
          }
          return;
        }
        if (activeTool === 'square' || activeTool === 'rectangle') {
          const pointer = event.target.getStage()?.getPointerPosition();
          if (pointer) {
             const world = screenToWorld(pointer, position, scale);
             setDragDraft({ start: world, current: world });
          }
        }
      }}
      onMouseUp={() => {
        if ((activeTool === 'square' || activeTool === 'rectangle') && dragDraft) {
          const width = Math.abs(dragDraft.current.x - dragDraft.start.x);
          const height = Math.abs(dragDraft.current.y - dragDraft.start.y);
          const x = Math.min(dragDraft.current.x, dragDraft.start.x);
          const y = Math.min(dragDraft.current.y, dragDraft.start.y);
          if (width >= 1 && height >= 1) {
            useDrawingStore.getState().addShape({
               type: activeTool, x, y, width: Math.max(width, 10), height: Math.max(height, 10), fill: '#3b82f6',
            });
          }
          setDragDraft(null);
          useEditorStore.getState().setTool('select');
        }
      }}
      onTouchEnd={() => {
        if ((activeTool === 'square' || activeTool === 'rectangle') && dragDraft) {
          const width = Math.abs(dragDraft.current.x - dragDraft.start.x);
          const height = Math.abs(dragDraft.current.y - dragDraft.start.y);
          const x = Math.min(dragDraft.current.x, dragDraft.start.x);
          const y = Math.min(dragDraft.current.y, dragDraft.start.y);
          if (width >= 1 && height >= 1) {
            useDrawingStore.getState().addShape({
               type: activeTool, x, y, width: Math.max(width, 10), height: Math.max(height, 10), fill: '#3b82f6',
            });
          }
          setDragDraft(null);
          useEditorStore.getState().setTool('select');
        }
      }}>
      <DrawingGrid {...size} position={position} scale={scale} gridMm={document.gridMm} />
      <Layer>
        {[...document.shapes]
          .sort((a, b) => shapeLayerOrder(a) - shapeLayerOrder(b))
          .map((shape) => <ShapeView key={shape.id} shape={shape} gridMm={document.gridMm} unit={document.displayUnit}
            selectable={activeTool === 'select' || activeTool === 'move'} selected={(activeTool === 'select' || activeTool === 'move') && selectedIds.includes(shape.id)}
            scale={scale} register={register} />)}
        {activeDraft && <Line points={draftPoints} closed={activeDraft.type === 'polygon'} stroke="#475569" strokeWidth={3 / scale} dash={[8 / scale, 8 / scale]} listening={false} />}
        {measurement && measurementEnd && <MeasurementOverlay start={measurement.start} end={measurementEnd}
          preview={true} scale={scale} unit={document.displayUnit} />}
        {dragDraft && (
          <Rect
            x={Math.min(dragDraft.start.x, dragDraft.current.x)}
            y={Math.min(dragDraft.start.y, dragDraft.current.y)}
            width={Math.abs(dragDraft.current.x - dragDraft.start.x)}
            height={Math.abs(dragDraft.current.y - dragDraft.start.y)}
            fill="#3b82f6"
            opacity={0.5}
            listening={false}
          />
        )}
        <AlignmentGuides guides={alignmentGuides} scale={scale} viewport={{ position, size }} />
        <ProximityGuides />
        <Transformer ref={transformerRef} rotateEnabled={activeTool === 'select'} resizeEnabled={activeTool === 'select'} flipEnabled={false}
          enabledAnchors={selectedIds.length > 1 ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']}
          rotateAnchorOffset={30} boundBoxFunc={(oldBox, newBox) => Math.abs(newBox.width) < 2 || Math.abs(newBox.height) < 2 ? oldBox : newBox}
          onTransformStart={() => {
            transformStart.current.clear();
            for (const id of selectedIds) {
              const shape = document.shapes.find(item => item.id === id);
              const node = nodes.current.get(id);
              if (shape && node) transformStart.current.set(id, { shape, scaleX: node.scaleX(), scaleY: node.scaleY() });
            }
          }}
          keepRatio={selectedIds.length > 1 || Boolean(selectedShape && isProportionalShape(selectedShape))}
          ignoreStroke={true} padding={selectedShape?.type === 'measurement' ? 0 : undefined} borderStroke="#1d4ed8" borderStrokeWidth={2}
          anchorStroke="#1d4ed8" anchorStrokeWidth={2} anchorFill="#ffffff" anchorSize={12}
          onTransformEnd={transformEnd} />
      </Layer>
    </Stage>
    {activeDraft && <button className="draft-cancel" type="button" onClick={cancelDraft}>Cancel drawing (Esc)</button>}
    {measurement && <button className="draft-cancel" type="button" onClick={() => { setMeasurement(null); useEditorStore.getState().setSnapStatus(null); }}>Clear measurement (Esc)</button>}
    <p className="canvas-help">{activeTool === 'measure' ? (measurement ? 'Move to the second point, then click to save the measurement. Escape cancels.' : 'Click two points to create a saved measurement. Select and delete it like any other shape.') : activeDraft ? (activeDraft.type === 'line' || activeDraft.type === 'wall' ? `Click the second point to finish the ${activeDraft.type}. Escape cancels.` : 'Click to add points. Double-click or Enter finishes; Escape cancels.') : activeTool === 'move' ? 'Move only: drag selected objects to translate them. M selects Move; V selects resize and rotate controls.' : activeTool === 'select' ? 'Select a shape. Drag the background to pan; scroll to zoom.' : `Click the canvas to place ${activeTool === 'text' ? 'text' : `a ${activeTool}`}.`}</p>
  </div>;
}
