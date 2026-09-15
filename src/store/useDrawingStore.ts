import { create } from 'zustand';
import type { Bounds, DrawingDocument, Shape } from '../domain/document';
import { MAX_SHAPES } from '../domain/document';
import { validateDocument, validateShape } from '../domain/validation';
import { loadRecovery } from '../services/recovery';
import { encodeDrawing } from '../services/drawingFiles';
import { hasPoints, isProportionalShape, resizePoints, resizeWallToLength } from '../domain/geometry';
import { WALL_DEFINITIONS } from '../domain/walls';

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
  updateGeometry: (id: string, bounds: Bounds, properties?: Partial<Pick<Shape, 'fill' | 'rotation' | 'startAngle' | 'endAngle' | 'wallType' | 'wallThicknessMm' | 'furnitureKind'>>) => void;
  updateText: (id: string, text: string) => void;
  updateWallProperties: (id: string, properties: { wallType: NonNullable<Shape['wallType']>; wallThicknessMm: number; lengthMm: number; rotation: number }) => void;
  deleteShape: (id: string) => void;
  updateSettings: (settings: Partial<Pick<DrawingDocument, 'name' | 'displayUnit' | 'gridMm'>>) => void;
  openDocument: (document: DrawingDocument) => void;
  undo: () => void;
  redo: () => void;
}
const HISTORY_LIMIT = 50;

export const useDrawingStore = create<DrawingState>((set) => {
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
    return hasPoints(shape)
      ? { ...shape, ...nextBounds, points: resizePoints(shape.points, shape, nextBounds) }
      : { ...shape, ...nextBounds };
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
    updateWallProperties: (id, properties) => updateShape(id, (shape) => {
      if (shape.type !== 'wall') throw new Error('Only walls have wall properties.');
      const resized = resizeWallToLength(shape, properties.lengthMm, properties.rotation);
      return {
        ...shape,
        ...resized.bounds,
        points: resized.points,
        wallType: properties.wallType,
        wallThicknessMm: properties.wallThicknessMm,
        rotation: properties.rotation,
        fill: WALL_DEFINITIONS[properties.wallType].color,
      };
    }),
    deleteShape: (id) => commit((document) => ({ ...document, shapes: document.shapes.filter((shape) => shape.id !== id) })),
    updateSettings: (settings) => commit((document) => validateDocument({ ...document, ...settings })),
    openDocument: (document) => commit(() => validateDocument(document)),
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
