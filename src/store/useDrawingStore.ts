import { create } from 'zustand';
import type { DrawingDocument, Shape, Bounds } from '../domain/document';
import { getShapePoints, flatShapePoints } from '../domain/document';
import { MAX_SHAPES } from '../domain/document';
import { validateDocument, validateShape } from '../domain/validation';
import { loadRecovery } from '../services/recovery';
import { encodeDrawing } from '../services/drawingFiles';
import { hasPoints, isProportionalShape, mergeMatchingWalls, resizeWallToLength, normalizePoints, wallLength } from '../domain/geometry';
import { WALL_DEFINITIONS } from '../domain/walls';
import type { WallType } from '../domain/walls';
import { useEditorStore } from './useEditorStore';

interface DrawingState {
  document: DrawingDocument;
  past: DrawingDocument[];
  future: DrawingDocument[];
  recoveryWarning: string | null;
  recoveryEnabled: boolean;
  enableRecovery: () => void;
  pauseRecovery: (warning: string) => void;
  addShape: (shape: Omit<Shape, 'id'>) => void;
  updateBounds: (id: string, bounds: Bounds) => void;
  updateGeometry: (id: string, bounds: Bounds, properties?: Partial<Pick<Shape, 'fill' | 'rotation' | 'startAngle' | 'endAngle' | 'wallType' | 'wallThicknessMm' | 'furnitureKind' | 'text' | 'fontSize'>>) => void;
  updateText: (id: string, text: string) => void;
  updateTextProperties: (id: string, properties: Partial<Pick<Shape, 'text' | 'fontSize' | 'fill'>>) => void;
  updateWallProperties: (id: string, properties: { wallType: NonNullable<Shape['wallType']>; wallThicknessMm: number; lengthMm?: number; rotation?: number }) => void;
  mergeWall: (id: string) => void;
  groupWalls: (ids: string[]) => void;
  ungroupShape: (id: string) => void;
  deleteShape: (id: string) => void;
  clearCanvas: () => void;
  updateSettings: (settings: Partial<Pick<DrawingDocument, 'name' | 'displayUnit' | 'gridMm'>>) => void;
  openDocument: (document: DrawingDocument) => void;
  exportState: () => DrawingDocument;
  importState: (data: unknown) => void;
  undo: () => void;
  redo: () => void;
}
const HISTORY_LIMIT = 50;

export const useDrawingStore = create<DrawingState>((set, get) => {
  const recovery = loadRecovery();
  function commit(change: (document: DrawingDocument) => DrawingDocument) {
    set((state) => {
      const document = change(state.document);
      if (document === state.document) return state;
      // A committed drawing must remain downloadable and recoverable.
      encodeDrawing(document);
      return { document, past: [...state.past, state.document].slice(-HISTORY_LIMIT), future: [] };
    });
  }
  function updateShape(id: string, change: (shape: Shape) => Shape) {
    commit((document) => {
      if (!document.shapes.some((shape) => shape.id === id)) return document;
      return { ...document, shapes: document.shapes.map((shape) => shape.id === id ? validateShape(change(shape)) : shape) };
    });
  }
  function applyBounds(shape: Shape, bounds: Bounds): Shape {
    const side = isProportionalShape(shape) ? Math.max(bounds.width, bounds.height) : undefined;
    const nextBounds = side === undefined ? bounds : { ...bounds, width: side, height: side };
    if (hasPoints(shape)) {
      const pts = getShapePoints(shape);
      let currentBoundingWidth = shape.width;
      let currentBoundingHeight = shape.height;
      if (pts.length > 0) {
        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        currentBoundingWidth = Math.max(...xs) - Math.min(...xs);
        currentBoundingHeight = Math.max(...ys) - Math.min(...ys);
      }
      // Prevent division by zero
      const safeWidth = currentBoundingWidth || 1;
      const safeHeight = currentBoundingHeight || 1;
      const scaleX = nextBounds.width / safeWidth;
      const scaleY = nextBounds.height / safeHeight;
      const scaledPoints = pts.map(p => ({ x: p.x * scaleX, y: p.y * scaleY }));
      return { ...shape, ...nextBounds, points: flatShapePoints(scaledPoints) };
    }
    return { ...shape, ...nextBounds };
  }
  return {
    document: recovery.document, past: [], future: [],
    recoveryWarning: recovery.warning, recoveryEnabled: recovery.enabled,
    enableRecovery: () => set({ recoveryEnabled: true, recoveryWarning: null }),
    pauseRecovery: (warning) => set({ recoveryEnabled: false, recoveryWarning: warning }),
    addShape: (shape) => commit((document) => {
      if (document.shapes.length >= MAX_SHAPES) throw new Error(`Maximum ${MAX_SHAPES} shapes reached.`);
      return { ...document, shapes: [...document.shapes, validateShape({ ...shape, id: crypto.randomUUID() })] };
    }),
    updateBounds: (id, bounds) => updateShape(id, (shape) => applyBounds(shape, bounds)),
    updateGeometry: (id, bounds, properties = {}) => updateShape(id, (shape) => ({ ...applyBounds(shape, bounds), ...properties })),
    updateText: (id, text) => updateShape(id, (shape) => shape.type === 'text' ? { ...shape, text } : shape),
    updateTextProperties: (id, properties) => updateShape(id, (shape) => shape.type === 'text' ? { ...shape, ...properties } : shape),
    updateWallProperties: (id, properties: { wallType: WallType, wallThicknessMm: number, lengthMm?: number, rotation?: number }) => updateShape(id, (shape) => {
      if (shape.type !== 'wall') throw new Error('Only walls have wall properties.');
      
      const currentRotation = (() => {
        if (shape.points && shape.points.length >= 4) {
          let angle = Math.atan2(shape.points[3] - shape.points[1], shape.points[2] - shape.points[0]) * (180 / Math.PI);
          if (angle < 0) angle += 360;
          return angle;
        }
        return shape.rotation ?? 0;
      })();
      
      const resized = resizeWallToLength(shape, properties.lengthMm ?? wallLength(shape), properties.rotation ?? currentRotation);
      return {
        ...shape,
        ...resized.bounds,
        points: flatShapePoints(resized.points),
        wallType: properties.wallType,
        wallThicknessMm: properties.wallThicknessMm,
        rotation: resized.rotation,
        fill: WALL_DEFINITIONS?.[properties.wallType]?.color || WALL_DEFINITIONS?.['interior_partition']?.color || '#334155',
      };
    }),
    mergeWall: (id) => commit((document) => mergeMatchingWalls(document, id)),
    groupWalls: (ids) => commit((document) => {
      const selectedWalls = document.shapes.filter((s) => ids.includes(s.id) && s.type === 'wall');
      if (selectedWalls.length < 2) return document;

      let currentPoints = getShapePoints(selectedWalls[0]).map((p) => ({ x: selectedWalls[0].x + p.x, y: selectedWalls[0].y + p.y }));
      const remainingSelected = [...selectedWalls.slice(1)];
      let canMerge = true;

      while (canMerge) {
        canMerge = false;
        for (let i = 0; i < remainingSelected.length; i++) {
          const shape = remainingSelected[i];
          if (shape.type !== 'wall') continue;

          const shapePoints = getShapePoints(shape).map((p) => ({ x: shape.x + p.x, y: shape.y + p.y }));
          const targetStart = currentPoints[0];
          const targetEnd = currentPoints[currentPoints.length - 1];
          const shapeStart = shapePoints[0];
          const shapeEnd = shapePoints[shapePoints.length - 1];

          const EPSILON = 5.0;
          const match = (p1: {x:number, y:number} | undefined, p2: {x:number, y:number} | undefined) => 
            p1 !== undefined && p2 !== undefined && Math.abs(p1.x - p2.x) < EPSILON && Math.abs(p1.y - p2.y) < EPSILON;

          if (match(targetEnd, shapeStart)) {
            currentPoints = [...currentPoints, ...shapePoints.slice(1)];
            remainingSelected.splice(i, 1);
            canMerge = true;
            break;
          } else if (match(targetEnd, shapeEnd)) {
            currentPoints = [...currentPoints, ...shapePoints.slice(0, -1).reverse()];
            remainingSelected.splice(i, 1);
            canMerge = true;
            break;
          } else if (match(targetStart, shapeEnd)) {
            currentPoints = [...shapePoints.slice(0, -1), ...currentPoints];
            remainingSelected.splice(i, 1);
            canMerge = true;
            break;
          } else if (match(targetStart, shapeStart)) {
            currentPoints = [...shapePoints.slice(1).reverse(), ...currentPoints];
            remainingSelected.splice(i, 1);
            canMerge = true;
            break;
          }
        }
      }

      if (remainingSelected.length === selectedWalls.length - 1) return document;

      const normalized = normalizePoints(currentPoints);
      const mergedWall: import('../domain/document').Shape = {
        ...selectedWalls[0],
        ...normalized.bounds,
        id: crypto.randomUUID(),
        points: normalized.points.flatMap((p) => [p.x, p.y]),
      };

      const mergedIds = selectedWalls.filter(s => !remainingSelected.includes(s)).map(s => s.id);
      const nextShapes = document.shapes.filter((s) => !mergedIds.includes(s.id));
      nextShapes.push(mergedWall);
      
      // Update selection out of band
      setTimeout(() => useEditorStore.getState().select(mergedWall.id), 0);

      return { ...document, shapes: nextShapes };
    }),
    ungroupShape: (id) => commit((document) => {
      const shapeIndex = document.shapes.findIndex((s) => s.id === id);
      const shape = document.shapes[shapeIndex];
      if (!shape || shape.type !== 'wall' || !shape.points || shape.points.length <= 4) return document;

      const newShapes = [...document.shapes];
      newShapes.splice(shapeIndex, 1);

      const points = shape.points;
      for (let i = 0; i < points.length - 2; i += 2) {
        const p1 = { x: shape.x + points[i], y: shape.y + points[i + 1] };
        const p2 = { x: shape.x + points[i + 2], y: shape.y + points[i + 3] };
        
        const normalized = normalizePoints([p1, p2]);
        const newShape: Shape = {
          ...shape,
          id: crypto.randomUUID(),
          wallType: shape.wallType ?? 'interior_partition',
          ...normalized.bounds,
          points: normalized.points.flatMap(p => [p.x, p.y]),
        };
        newShapes.push(newShape);
      }
      return { ...document, shapes: newShapes };
    }),
    deleteShape: (id) => commit((document) => ({ ...document, shapes: document.shapes.filter((shape) => shape.id !== id) })),
    clearCanvas: () => commit((document) => ({ ...document, shapes: [] })),
    updateSettings: (settings) => commit((document) => validateDocument({ ...document, ...settings })),
    openDocument: (document) => commit(() => validateDocument(document)),
    exportState: () => validateDocument(get().document),
    importState: (data: unknown) => {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      const validated = validateDocument(parsed);
      set({ document: validated, past: [], future: [], recoveryWarning: null });
      encodeDrawing(validated);
    },
    undo: () => set((state) => {
      const previous = state.past.at(-1);
      return previous ? { document: previous, past: state.past.slice(0, -1), future: [state.document, ...state.future].slice(0, HISTORY_LIMIT) } : state;
    }),
    redo: () => set((state) => {
      const next = state.future[0];
      return next ? { document: next, past: [...state.past, state.document].slice(-HISTORY_LIMIT), future: state.future.slice(1) } : state;
    }),
  };
});
