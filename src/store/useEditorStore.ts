import { create } from 'zustand';
import type { AlignmentGuide, Point } from '../domain/geometry';
import type { Shape, ShapeType } from '../domain/document';
import type { WallType } from '../domain/walls';
import { DEFAULT_WALL_TYPE, WALL_DEFINITIONS } from '../domain/walls';
import type { FurnitureKind } from '../domain/furniture';
import { DEFAULT_FURNITURE_KIND } from '../domain/furniture';
import type { DoorType, WindowType } from '../domain/doors';
import { DEFAULT_DOOR_TYPE, DEFAULT_WINDOW_TYPE } from '../domain/doors';

export type ActiveTool = 'select' | 'move' | 'measure' | ShapeType;
export type SnapStatus = 'Object snap' | 'Wall join snap' | 'Grid snap' | 'Free placement (Alt)' | 'Move only' | null;
export interface WallDefaults { wallType: WallType; wallThicknessMm: number }
export const BASE_PIXELS_PER_MM = 96 / 25.4 / 25;
interface EditorState {
  activeTool: ActiveTool;
  selectedIds: string[];
  editingId: string | null;
  scale: number;
  position: Point;
  error: string | null;
  snapStatus: SnapStatus;
  wallDefaults: WallDefaults;
  alignmentGuides: AlignmentGuide[];
  showProximityGuides: boolean;
  proximityShape: Shape | null;
  toggleProximityGuides: () => void;
  setProximityShape: (shape: Shape | null) => void;
  placedFurnitureKind: FurnitureKind;
  placedDoorType: DoorType;
  placedWindowType: WindowType;
  setTool: (tool: ActiveTool) => void;
  select: (id: string | null, multi?: boolean) => void;
  selectMany: (ids: string[]) => void;
  editText: (id: string | null) => void;
  setViewport: (position: Point, scale: number) => void;
  reportError: (error: unknown) => void;
  setSnapStatus: (status: SnapStatus) => void;
  setWallDefaults: (defaults: WallDefaults) => void;
  setAlignmentGuides: (guides: AlignmentGuide[]) => void;
  setPlacedFurnitureKind: (kind: FurnitureKind) => void;
  setPlacedDoorType: (doorType: DoorType) => void;
  setPlacedWindowType: (windowType: WindowType) => void;
  resetView: () => void;
  displayUnit: 'inches' | 'feet' | 'millimeters' | 'meters';
  setDisplayUnit: (unit: 'inches' | 'feet' | 'millimeters' | 'meters') => void;
}
export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select', selectedIds: [], editingId: null,
  scale: BASE_PIXELS_PER_MM, position: { x: 40, y: 40 }, error: null, snapStatus: null,
  wallDefaults: { wallType: DEFAULT_WALL_TYPE, wallThicknessMm: WALL_DEFINITIONS[DEFAULT_WALL_TYPE].defaultThicknessMm },
  alignmentGuides: [],
  showProximityGuides: true,
  proximityShape: null,
  toggleProximityGuides: () => set(state => ({ showProximityGuides: !state.showProximityGuides })),
  setProximityShape: (proximityShape) => set({ proximityShape }),
  placedFurnitureKind: DEFAULT_FURNITURE_KIND,
  placedDoorType: DEFAULT_DOOR_TYPE,
  placedWindowType: DEFAULT_WINDOW_TYPE,
  setTool: (activeTool) => set(state => ({ activeTool, alignmentGuides: [], proximityShape: null,
    selectedIds: activeTool === 'select' || activeTool === 'move' ? state.selectedIds : [] })),
  selectMany: selectedIds => set({ selectedIds: [...new Set(selectedIds)], alignmentGuides: [], proximityShape: null }),
  select: (id, multi) => set((state) => {
    if (!id) return { selectedIds: [], alignmentGuides: [], proximityShape: null };
    if (multi) {
      const selectedIds = state.selectedIds.includes(id) ? state.selectedIds.filter(s => s !== id) : [...state.selectedIds, id];
      return { selectedIds, alignmentGuides: [], proximityShape: null };
    }
    return { selectedIds: [id], alignmentGuides: [], proximityShape: null };
  }),
  editText: (editingId) => set({ editingId }),
  setViewport: (position, scale) => set({ position, scale }),
  reportError: (error) => set({ error: error === null ? null : error instanceof Error ? error.message : 'The operation could not be completed.' }),
  setSnapStatus: (snapStatus) => set({ snapStatus }),
  setWallDefaults: (wallDefaults) => set({ wallDefaults }),
  setAlignmentGuides: (alignmentGuides) => set({ alignmentGuides }),
  setPlacedFurnitureKind: (placedFurnitureKind) => set({ placedFurnitureKind, activeTool: 'furniture' }),
  setPlacedDoorType: (placedDoorType) => set({ placedDoorType, activeTool: 'door' }),
  setPlacedWindowType: (placedWindowType) => set({ placedWindowType, activeTool: 'window' }),
  resetView: () => set({ activeTool: 'select', selectedIds: [], editingId: null, position: { x: 40, y: 40 }, scale: BASE_PIXELS_PER_MM, snapStatus: null, alignmentGuides: [], proximityShape: null }),
  displayUnit: 'inches',
  setDisplayUnit: (displayUnit) => set({ displayUnit }),
}));
