import type { WallType } from './walls';
import type { FurnitureKind } from './furniture';
import type { DoorType, WindowType } from './doors';

/** All geometry is actual millimeters, never screen pixels or paper millimeters. */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ShapeType =
  | 'rectangle'
  | 'square'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'line'
  | 'polyline'
  | 'polygon'
  | 'arc'
  | 'text'
  | 'wall'
  | 'measurement'
  | 'furniture'
  | 'door'
  | 'window';

export interface ShapePoint {
  x: number;
  y: number;
}

export interface Shape extends Bounds {
  id: string;
  type: ShapeType;
  fill: string;
  text?: string;
  /** Local points, relative to the shape's top-left bounds, for line-based shapes. */
  points?: ShapePoint[];
  /** Degrees clockwise. Zero is the unrotated shape. */
  rotation?: number;
  /** Arc angles in degrees, used only by arc shapes. */
  startAngle?: number;
  endAngle?: number;
  /** Wall-only drafting metadata. Thickness is actual millimeters. */
  wallType?: WallType;
  wallThicknessMm?: number;
  /** Furniture-only semantic identity; dimensions remain ordinary bounds. */
  furnitureKind?: FurnitureKind;
  /** Door/window opening metadata. */
  doorType?: DoorType;
  windowType?: WindowType;
  swingHinge?: 'left' | 'right';
  swingDirection?: 'inside' | 'outside';
}

export interface DrawingDocument {
  format: 'karma-draft';
  version: 1;
  units: 'mm';
  name: string;
  paperScale: 25;
  displayUnit: 'mm' | 'cm';
  gridMm: number;
  shapes: Shape[];
}

export const MAX_SHAPES = 2000;
export const MAX_TEXT_LENGTH = 10000;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_DISTANCE_MM = 1000000;
export const MIN_SIZE_MM = 0.1;
export const MAX_POINTS_PER_SHAPE = 200;

export function createDocument(): DrawingDocument {
  return {
    format: 'karma-draft', version: 1, units: 'mm', name: 'My apartment',
    paperScale: 25, displayUnit: 'mm', gridMm: 25.4, shapes: [],
  };
}
