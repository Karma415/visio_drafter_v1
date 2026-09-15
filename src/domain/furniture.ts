/**
 * Furniture definitions are deliberately separate from canvas rendering. Sizes
 * are real-world millimeters and are only sensible starting points; users can
 * resize every furniture object using the normal property panel or handles.
 */
export const FURNITURE_KINDS = [
  'bed',
  'sofa',
  'table',
  'chair',
  'desk',
  'l_desk',
  'floor_cabinet',
  'wall_cabinet',
  'bookshelf',
  'tall_cabinet',
  'tv_unit',
  'desk_chair',
  'console_table',
  'wall_shelf',
  'washer_dryer',
  'dishwasher',
  'countertop_dishwasher',
] as const;

export type FurnitureKind = typeof FURNITURE_KINDS[number];

export interface FurnitureDefinition {
  label: string;
  defaultWidthMm: number;
  defaultHeightMm: number;
  color: string;
}

export const FURNITURE_DEFINITIONS: Record<FurnitureKind, FurnitureDefinition> = {
  bed: { label: 'Bed', defaultWidthMm: 1371.6, defaultHeightMm: 1905, color: '#60a5fa' },
  sofa: { label: 'Sofa', defaultWidthMm: 1828.8, defaultHeightMm: 914.4, color: '#a78bfa' },
  table: { label: 'Table', defaultWidthMm: 1219.2, defaultHeightMm: 762, color: '#f59e0b' },
  chair: { label: 'Chair', defaultWidthMm: 457.2, defaultHeightMm: 457.2, color: '#34d399' },
  desk: { label: 'Desk', defaultWidthMm: 1219.2, defaultHeightMm: 609.6, color: '#38bdf8' },
  l_desk: { label: 'L-shaped desk', defaultWidthMm: 1524, defaultHeightMm: 1524, color: '#38bdf8' },
  floor_cabinet: { label: 'Kitchen base cabinet', defaultWidthMm: 762, defaultHeightMm: 609.6, color: '#94a3b8' },
  wall_cabinet: { label: 'Kitchen wall cabinet', defaultWidthMm: 762, defaultHeightMm: 304.8, color: '#94a3b8' },
  bookshelf: { label: 'Bookshelf', defaultWidthMm: 914.4, defaultHeightMm: 304.8, color: '#ca8a04' },
  tall_cabinet: { label: 'Tall pantry cabinet', defaultWidthMm: 609.6, defaultHeightMm: 609.6, color: '#94a3b8' },
  tv_unit: { label: 'TV / Media unit', defaultWidthMm: 1219.2, defaultHeightMm: 355.6, color: '#64748b' },
  desk_chair: { label: 'Desk chair', defaultWidthMm: 609.6, defaultHeightMm: 609.6, color: '#34d399' },
  console_table: { label: 'Console table', defaultWidthMm: 1066.8, defaultHeightMm: 355.6, color: '#f59e0b' },
  wall_shelf: { label: 'Wall shelf', defaultWidthMm: 914.4, defaultHeightMm: 254, color: '#ca8a04' },
  washer_dryer: { label: 'Washer / Dryer', defaultWidthMm: 685.8, defaultHeightMm: 685.8, color: '#64748b' },
  dishwasher: { label: 'Dishwasher', defaultWidthMm: 609.6, defaultHeightMm: 609.6, color: '#64748b' },
  countertop_dishwasher: { label: 'Countertop dishwasher', defaultWidthMm: 558.8, defaultHeightMm: 508, color: '#64748b' },
};

export const DEFAULT_FURNITURE_KIND: FurnitureKind = 'bed';

export function isFurnitureKind(value: unknown): value is FurnitureKind {
  return typeof value === 'string' && (FURNITURE_KINDS as readonly string[]).includes(value);
}
