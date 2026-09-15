/**
 * Wall-specific data belongs here rather than in generic canvas components.
 * Thickness stays user-editable: these are drafting categories, not building-code
 * assertions or construction advice.
 */
export const WALL_TYPES = [
  'exterior_masonry',
  'exterior_concrete',
  'party_wall',
  'unit_demising',
  'corridor',
  'interior_partition',
] as const;

export type WallType = typeof WALL_TYPES[number];
export type WallPattern = 'masonry-joints' | 'concrete-stipple' | 'double-line' | 'dash-line' | 'solid';

export const WALL_DEFINITIONS: Record<WallType, { label: string; color: string; defaultThicknessMm: number; pattern: WallPattern }> = {
  exterior_masonry: { label: 'Exterior masonry wall', color: '#7c2d12', defaultThicknessMm: 304.8, pattern: 'masonry-joints' },
  exterior_concrete: { label: 'Exterior concrete wall', color: '#475569', defaultThicknessMm: 203.2, pattern: 'concrete-stipple' },
  party_wall: { label: 'Party wall', color: '#92400e', defaultThicknessMm: 304.8, pattern: 'double-line' },
  unit_demising: { label: 'Unit demising wall', color: '#1e3a8a', defaultThicknessMm: 152.4, pattern: 'double-line' },
  corridor: { label: 'Corridor wall', color: '#0f766e', defaultThicknessMm: 152.4, pattern: 'dash-line' },
  interior_partition: { label: 'Interior room partition', color: '#334155', defaultThicknessMm: 101.6, pattern: 'solid' },
};

export const DEFAULT_WALL_TYPE: WallType = 'interior_partition';

export function isWallType(value: unknown): value is WallType {
  return typeof value === 'string' && (WALL_TYPES as readonly string[]).includes(value);
}
