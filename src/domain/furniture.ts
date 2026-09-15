/**
 * Furniture definitions are deliberately separate from canvas rendering. Sizes
 * are real-world millimeters and are only sensible starting points; users can
 * resize every furniture object using the normal property panel or handles.
 */
export const FURNITURE_KINDS = ['bed', 'sofa', 'table', 'chair'] as const;

export type FurnitureKind = typeof FURNITURE_KINDS[number];

export interface FurnitureDefinition {
  label: string;
  defaultWidthMm: number;
  defaultHeightMm: number;
  color: string;
}

export const FURNITURE_DEFINITIONS: Record<FurnitureKind, FurnitureDefinition> = {
  // Full/double bed, sofa, four-seat table, and dining chair starting sizes.
  bed: { label: 'Bed', defaultWidthMm: 1371.6, defaultHeightMm: 1905, color: '#60a5fa' },
  sofa: { label: 'Sofa', defaultWidthMm: 1828.8, defaultHeightMm: 914.4, color: '#a78bfa' },
  table: { label: 'Table', defaultWidthMm: 1219.2, defaultHeightMm: 762, color: '#f59e0b' },
  chair: { label: 'Chair', defaultWidthMm: 457.2, defaultHeightMm: 457.2, color: '#34d399' },
};

export const DEFAULT_FURNITURE_KIND: FurnitureKind = 'bed';

export function isFurnitureKind(value: unknown): value is FurnitureKind {
  return typeof value === 'string' && (FURNITURE_KINDS as readonly string[]).includes(value);
}
