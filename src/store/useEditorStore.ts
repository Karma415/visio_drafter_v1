import { create } from 'zustand';
import type { Point } from '../domain/geometry';
import type { ShapeType } from '../domain/document';
import type { WallType } from '../domain/walls';
import { DEFAULT_WALL_TYPE, WALL_DEFINITIONS } from '../domain/walls';

export type ActiveTool = 'select' | 'measure' | ShapeType;
export type SnapStatus = 'Object snap' | 'Wall join snap' | 'Grid snap' | 'Free placement (Alt)' | null;
export interface WallDefaults { wallType: WallType; wallThicknessMm: number }
export const BASE_PIXELS_PER_MM = 96 / 25.4 / 25;
interface EditorState {
  activeTool: ActiveTool;
  selectedId: string | null;
  editingId: string | null;
  scale: number;
  position: Point;
  error: string | null;
  snapStatus: SnapStatus;
  wallDefaults: WallDefaults;
  setTool: (tool: ActiveTool) => void;
  select: (id: string | null) => void;
  editText: (id: string | null) => void;
  setViewport: (position: Point, scale: number) => void;
  reportError: (error: unknown) => void;
  setSnapStatus: (status: SnapStatus) => void;
  setWallDefaults: (defaults: WallDefaults) => void;
  resetView: () => void;
}
export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select', selectedId: null, editingId: null,
  scale: BASE_PIXELS_PER_MM, position: { x: 40, y: 40 }, error: null, snapStatus: null,
  wallDefaults: { wallType: DEFAULT_WALL_TYPE, wallThicknessMm: WALL_DEFINITIONS[DEFAULT_WALL_TYPE].defaultThicknessMm },
  setTool: (activeTool) => set({ activeTool }),
  select: (selectedId) => set({ selectedId }),
  editText: (editingId) => set({ editingId }),
  setViewport: (position, scale) => set({ position, scale }),
  reportError: (error) => set({ error: error === null ? null : error instanceof Error ? error.message : 'The operation could not be completed.' }),
  setSnapStatus: (snapStatus) => set({ snapStatus }),
  setWallDefaults: (wallDefaults) => set({ wallDefaults }),
  resetView: () => set({ activeTool: 'select', selectedId: null, editingId: null, position: { x: 40, y: 40 }, scale: BASE_PIXELS_PER_MM, snapStatus: null }),
}));
