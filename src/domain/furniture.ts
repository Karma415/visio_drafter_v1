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
  'dresser',
  'floor_cabinet',
  'wall_cabinet',
  'bookshelf',
  'tall_cabinet',
  'tv_unit',
  'desk_chair',
  'console_table',
  'wall_shelf',
  'refrigerator',
  'stove',
  'washer_dryer',
  'dishwasher',
  'countertop_dishwasher',
  'kitchen_sink',
  'bathroom_vanity',
  'toilet',
  'bathtub',
  'shower',
] as const;

export type FurnitureKind = typeof FURNITURE_KINDS[number];

export type FurnitureCategory = 'furniture' | 'fixtures' | 'appliances' | 'electronics';

export const FURNITURE_CATEGORIES: { id: FurnitureCategory; label: string }[] = [
  { id: 'furniture', label: 'Furniture' },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'appliances', label: 'Appliances' },
  { id: 'electronics', label: 'Electronics' },
];

export interface FurnitureDefinition {
  label: string;
  category: FurnitureCategory;
  defaultWidthMm: number;
  defaultHeightMm: number;
  color: string;
}

export const FURNITURE_DEFINITIONS: Record<FurnitureKind, FurnitureDefinition> = {
  bed: { label: 'Bed', category: 'furniture', defaultWidthMm: 1371.6, defaultHeightMm: 1905, color: '#60a5fa' },
  sofa: { label: 'Sofa', category: 'furniture', defaultWidthMm: 1828.8, defaultHeightMm: 914.4, color: '#a78bfa' },
  table: { label: 'Table', category: 'furniture', defaultWidthMm: 1219.2, defaultHeightMm: 762, color: '#f59e0b' },
  chair: { label: 'Chair', category: 'furniture', defaultWidthMm: 457.2, defaultHeightMm: 457.2, color: '#34d399' },
  desk: { label: 'Desk', category: 'furniture', defaultWidthMm: 1219.2, defaultHeightMm: 609.6, color: '#38bdf8' },
  l_desk: { label: 'L-shaped desk', category: 'furniture', defaultWidthMm: 1524, defaultHeightMm: 1524, color: '#38bdf8' },
  dresser: { label: 'Dresser', category: 'furniture', defaultWidthMm: 1219.2, defaultHeightMm: 508, color: '#ca8a04' },
  floor_cabinet: { label: 'Kitchen base cabinet', category: 'furniture', defaultWidthMm: 762, defaultHeightMm: 609.6, color: '#94a3b8' },
  wall_cabinet: { label: 'Kitchen wall cabinet', category: 'furniture', defaultWidthMm: 762, defaultHeightMm: 304.8, color: '#94a3b8' },
  bookshelf: { label: 'Bookshelf', category: 'furniture', defaultWidthMm: 914.4, defaultHeightMm: 304.8, color: '#ca8a04' },
  tall_cabinet: { label: 'Tall pantry cabinet', category: 'furniture', defaultWidthMm: 609.6, defaultHeightMm: 609.6, color: '#94a3b8' },
  desk_chair: { label: 'Desk chair', category: 'furniture', defaultWidthMm: 609.6, defaultHeightMm: 609.6, color: '#34d399' },
  console_table: { label: 'Console table', category: 'furniture', defaultWidthMm: 1066.8, defaultHeightMm: 355.6, color: '#f59e0b' },
  wall_shelf: { label: 'Wall shelf', category: 'furniture', defaultWidthMm: 914.4, defaultHeightMm: 254, color: '#ca8a04' },
  tv_unit: { label: 'TV / Media unit', category: 'electronics', defaultWidthMm: 1219.2, defaultHeightMm: 355.6, color: '#64748b' },
  refrigerator: { label: 'Refrigerator', category: 'appliances', defaultWidthMm: 914.4, defaultHeightMm: 812.8, color: '#64748b' },
  stove: { label: 'Stove / Range', category: 'appliances', defaultWidthMm: 762, defaultHeightMm: 711.2, color: '#64748b' },
  washer_dryer: { label: 'Washer / Dryer', category: 'appliances', defaultWidthMm: 685.8, defaultHeightMm: 685.8, color: '#64748b' },
  dishwasher: { label: 'Dishwasher', category: 'appliances', defaultWidthMm: 609.6, defaultHeightMm: 609.6, color: '#64748b' },
  countertop_dishwasher: { label: 'Countertop dishwasher', category: 'appliances', defaultWidthMm: 558.8, defaultHeightMm: 508, color: '#64748b' },
  kitchen_sink: { label: 'Kitchen sink', category: 'fixtures', defaultWidthMm: 838.2, defaultHeightMm: 558.8, color: '#0ea5e9' },
  bathroom_vanity: { label: 'Bathroom vanity', category: 'fixtures', defaultWidthMm: 762, defaultHeightMm: 533.4, color: '#0ea5e9' },
  toilet: { label: 'Toilet', category: 'fixtures', defaultWidthMm: 508, defaultHeightMm: 711.2, color: '#0ea5e9' },
  bathtub: { label: 'Bathtub', category: 'fixtures', defaultWidthMm: 1524, defaultHeightMm: 812.8, color: '#0ea5e9' },
  shower: { label: 'Shower stall', category: 'fixtures', defaultWidthMm: 914.4, defaultHeightMm: 914.4, color: '#0ea5e9' },
};

export const DEFAULT_FURNITURE_KIND: FurnitureKind = 'bed';

export function isFurnitureKind(value: unknown): value is FurnitureKind {
  return typeof value === 'string' && (FURNITURE_KINDS as readonly string[]).includes(value);
}
