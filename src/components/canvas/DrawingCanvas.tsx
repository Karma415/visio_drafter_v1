import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { isCenteredShape, isProportionalShape, nodePosition, normalizePoints, screenToWorld, snapOpeningOrigin, snapToDrawingPointWithKind, snapToWallFace, snapToWallPoint, snapWallEndpoint, snappedBounds } from '../../domain/geometry';
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
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [draft, setDraft] = useState<{ type: 'line' | 'polyline' | 'polygon' | 'wall'; points: ShapePoint[]; pointer: ShapePoint | null } | null>(null);
  const [measurement, setMeasurement] = useState<{ start: ShapePoint; pointer: ShapePoint | null } | null>(null);
  const document = useDrawingStore((state) => state.document);
  const activeTool = useEditorStore((state) => state.activeTool);
  const selectedId = useEditorStore((state) => state.selectedId);
  const scale = useEditorStore((state) => state.scale);
  const position = useEditorStore((state) => state.position);
  const wallDefaults = useEditorStore((state) => state.wallDefaults);
  const alignmentGuides = useEditorStore((state) => state.alignmentGuides);
  const selectedShape = document.shapes.find((shape) => shape.id === selectedId);
  const register = useCallback((id: string, node: ShapeNode | null) => {
    if (!node) {
      nodes.current.delete(id);
      return;
    }
    nodes.current.set(id, node);
    // react-konva creates child nodes after React has committed selection state.
    // Attaching here makes a just-created or just-selected shape deterministic.
    const editor = useEditorStore.getState();
    if (editor.activeTool === 'select' && editor.selectedId === id) {
      transformerRef.current?.nodes([node]);
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
    const node = selectedId && activeTool === 'select' ? nodes.current.get(selectedId) : undefined;
    transformerRef.current?.nodes(node ? [node] : []);
    transformerRef.current?.getLayer()?.batchDraw();
  }, [selectedId, activeTool, document.shapes]);

  const activeDraft = draft?.type === activeTool ? draft : null;

  function cancelDraft() {
    setDraft(null);
    useEditorStore.getState().setSnapStatus(null);
  }

  function snapStatus(kind: 'object' | 'wall' | 'grid' | 'free') {
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
        type, ...normalized.bounds, points: normalized.points,
        fill: type === 'polygon' ? '#93c5fd' : type === 'wall' ? WALL_DEFINITIONS[wallDefaults.wallType].color : '#1d4ed8',
        ...(type === 'wall' ? wallDefaults : {}),
      });
      const added = useDrawingStore.getState().document.shapes.at(-1);
      setDraft(null);
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
    if (activeTool === 'select') {
      if (event.target === stage) editor.select(null);
      return;
    }
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const world = screenToWorld(pointer, position, scale);
    if (activeTool === 'measure') {
      const snapResult = event.evt.altKey
        ? { point: world, kind: 'free' as const }
        : snapToWallFace(world, document.shapes, document.gridMm, 16 / scale);
      if (!measurement) {
        setMeasurement({ start: snapResult.point, pointer: snapResult.point });
      } else {
        try {
          const normalized = normalizePoints([measurement.start, snapResult.point]);
          useDrawingStore.getState().addShape({ type: 'measurement', ...normalized.bounds, points: normalized.points, fill: '#dc2626' });
          const added = useDrawingStore.getState().document.shapes.at(-1);
          setMeasurement(null);
          editor.setTool('select');
          editor.select(added?.id ?? null);
        } catch (error) { editor.reportError(error); }
      }
      editor.setSnapStatus(snapStatus(snapResult.kind));
      return;
    }
    const snapResult = event.evt.altKey
      ? { point: world, kind: 'free' as const }
      : activeTool === 'wall'
        ? activeDraft?.type === 'wall' && activeDraft.points[0]
          ? snapWallEndpoint(world, activeDraft.points[0], document.shapes, document.gridMm, 16 / scale)
          : snapToWallPoint(world, document.shapes, document.gridMm, 16 / scale)
        : snapToDrawingPointWithKind(world, document.shapes, document.gridMm, 16 / scale);
    const point = snapResult.point;
    if (activeTool === 'line' || activeTool === 'polyline' || activeTool === 'polygon' || activeTool === 'wall') {
      if (!activeDraft) {
        setDraft({ type: activeTool, points: [point], pointer: point });
        editor.setSnapStatus(snapStatus(snapResult.kind));
        return;
      }
      const points = [...activeDraft.points, point];
      if (activeTool === 'line' || activeTool === 'wall') {
        commitPath(activeTool, points);
        editor.setSnapStatus(snapStatus(snapResult.kind));
      } else if ('detail' in event.evt && event.evt.detail >= 2 && points.length >= (activeTool === 'polygon' ? 3 : 2)) {
        // Unlike Konva's stage-level dblclick event, the native click count is
        // tied to this exact background click and cannot finish an earlier path.
        commitPath(activeTool, points);
        editor.setSnapStatus(snapStatus(snapResult.kind));
      } else {
        setDraft({ ...activeDraft, points, pointer: point });
        editor.setSnapStatus(snapStatus(snapResult.kind));
      }
      return;
    }
    try {
      const placedKind = editor.placedFurnitureKind;
      const furniture = activeTool === 'furniture' ? FURNITURE_DEFINITIONS[placedKind] : null;
      const doorDef = activeTool === 'door' ? OPENING_DEFINITIONS[editor.placedDoorType] : null;
      const windowDef = activeTool === 'window' ? OPENING_DEFINITIONS[editor.placedWindowType] : null;

      const width = furniture?.defaultWidthMm
        ?? doorDef?.defaultWidthMm
        ?? windowDef?.defaultWidthMm
        ?? (activeTool === 'text' ? 1219.2 : activeTool === 'rectangle' ? 3048 : 609.6);

      const height = furniture?.defaultHeightMm
        ?? doorDef?.defaultThicknessMm
        ?? windowDef?.defaultThicknessMm
        ?? (activeTool === 'text' ? 254 : activeTool === 'rectangle' ? 3048 : 609.6);

      const fill = furniture?.color
        ?? doorDef?.color
        ?? windowDef?.color
        ?? (activeTool === 'text' ? '#111827' : activeTool === 'arc' ? '#1d4ed8' : activeTool === 'circle' || activeTool === 'ellipse' ? '#8b5cf6' : '#3b82f6');

      let placeX = point.x;
      let placeY = point.y;
      let placeHeight = height;
      let placeRotation = 0;
      let finalKind = snapResult.kind;

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

      useDrawingStore.getState().addShape({
        type: activeTool, x: placeX, y: placeY,
        width, height: placeHeight, fill,
        ...(placeRotation ? { rotation: placeRotation } : {}),
        ...(furniture ? { furnitureKind: placedKind } : {}),
        ...(doorDef ? { doorType: editor.placedDoorType, swingHinge: 'left', swingDirection: 'inside' } : {}),
        ...(windowDef ? { windowType: editor.placedWindowType } : {}),
        ...(activeTool === 'text' ? { text: 'Select and click Edit Text' } : {}),
        ...(activeTool === 'arc' ? { startAngle: 0, endAngle: 180 } : {}),
      });
      editor.setTool('select');
      const added = useDrawingStore.getState().document.shapes.at(-1);
      editor.select(added?.id ?? null);
      editor.setSnapStatus(snapStatus(finalKind));
    } catch (error) { editor.reportError(error); }
  }
  function transformEnd() {
    const node = selectedId ? nodes.current.get(selectedId) : undefined;
    const shape = document.shapes.find((item) => item.id === selectedId);
    if (!node || !shape) return;
    const width = node.width() * node.scaleX();
    const height = node.height() * node.scaleY();
    const centered = isCenteredShape(shape);
    const bounds = snappedBounds({
      x: node.x() - (centered ? width / 2 : 0), y: node.y() - (centered ? height / 2 : 0), width, height,
    }, document.gridMm);
    node.scale({ x: 1, y: 1 });
    try {
      const rotation = shape.type === 'arc'
        ? node.rotation() - (shape.startAngle ?? 0)
        : node.rotation();
      useDrawingStore.getState().updateGeometry(shape.id, bounds, { rotation });
      node.position(nodePosition({ ...shape, ...bounds }));
      node.size({ width: bounds.width, height: bounds.height });
    } catch (error) {
      node.position(nodePosition(shape));
      node.size({ width: shape.width, height: shape.height });
      useEditorStore.getState().reportError(error);
    }
    transformerRef.current?.forceUpdate();
  }
  function pointerMove(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    const world = screenToWorld(pointer, position, scale);
    if (activeTool === 'measure' && measurement) {
      const point = event.evt.altKey
        ? world
        : snapToWallFace(world, document.shapes, document.gridMm, 16 / scale).point;
      setMeasurement((current) => current ? { ...current, pointer: point } : current);
      return;
    }
    if (!activeDraft) return;
    const point = event.evt.altKey
      ? world
      : activeDraft.type === 'wall'
        ? snapWallEndpoint(world, activeDraft.points[0], document.shapes, document.gridMm, 16 / scale).point
        : snapToDrawingPointWithKind(world, document.shapes, document.gridMm, 16 / scale).point;
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
    <Stage width={size.width} height={size.height} x={position.x} y={position.y}
      scaleX={scale} scaleY={scale} draggable={activeTool === 'select'}
      onWheel={wheel} onClick={click} onTap={click}
      onMouseMove={pointerMove} onTouchMove={pointerMove} onDragMove={pan} onDragEnd={pan}>
      <DrawingGrid {...size} position={position} scale={scale} gridMm={document.gridMm} />
      <Layer>
        {[...document.shapes]
          .sort((a, b) => shapeLayerOrder(a) - shapeLayerOrder(b))
          .map((shape) => <ShapeView key={shape.id} shape={shape} gridMm={document.gridMm} unit={document.displayUnit}
            selectable={activeTool === 'select'} selected={activeTool === 'select' && selectedId === shape.id}
            scale={scale} register={register} />)}
        {activeDraft && <Line points={draftPoints} closed={activeDraft.type === 'polygon'} stroke="#475569" strokeWidth={3 / scale} dash={[8 / scale, 8 / scale]} listening={false} />}
        {measurement && measurementEnd && <MeasurementOverlay start={measurement.start} end={measurementEnd}
          preview={true} scale={scale} unit={document.displayUnit} />}
        <AlignmentGuides guides={alignmentGuides} scale={scale} viewport={{ position, size }} />
        <Transformer ref={transformerRef} rotateEnabled={selectedShape?.type !== 'measurement'} flipEnabled={false}
          keepRatio={Boolean(selectedShape && isProportionalShape(selectedShape))}
          ignoreStroke={true} borderStroke="#1d4ed8" borderStrokeWidth={2}
          anchorStroke="#1d4ed8" anchorStrokeWidth={2} anchorFill="#ffffff" anchorSize={12}
          onTransformEnd={transformEnd} />
      </Layer>
    </Stage>
    {activeDraft && <button className="draft-cancel" type="button" onClick={cancelDraft}>Cancel drawing (Esc)</button>}
    {measurement && <button className="draft-cancel" type="button" onClick={() => { setMeasurement(null); useEditorStore.getState().setSnapStatus(null); }}>Clear measurement (Esc)</button>}
    <p className="canvas-help">{activeTool === 'measure' ? (measurement ? 'Move to the second point, then click to save the measurement. Escape cancels.' : 'Click two points to create a saved measurement. Select and delete it like any other shape.') : activeDraft ? (activeDraft.type === 'line' || activeDraft.type === 'wall' ? `Click the second point to finish the ${activeDraft.type}. Escape cancels.` : 'Click to add points. Double-click or Enter finishes; Escape cancels.') : activeTool === 'select' ? 'Select a shape. Drag the background to pan; scroll to zoom.' : `Click the canvas to place ${activeTool === 'text' ? 'text' : `a ${activeTool}`}.`}</p>
  </div>;
}
