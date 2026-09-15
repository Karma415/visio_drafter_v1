// Legacy import path. Document geometry now uses actual millimeters.
// The current API is documented in useDrawingStore.ts; no second store is created.
export { useDrawingStore as useCanvasStore } from './useDrawingStore';
export type { Shape } from '../domain/document';
