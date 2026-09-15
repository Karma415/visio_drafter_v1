export const DOOR_TYPES = [
  'single_door',
  'double_door',
  'sliding_door',
  'bifold_door',
] as const;

export type DoorType = typeof DOOR_TYPES[number];

export const WINDOW_TYPES = [
  'standard_window',
  'large_window',
  'sliding_window',
] as const;

export type WindowType = typeof WINDOW_TYPES[number];

export type OpeningKind = DoorType | WindowType;

export interface OpeningDefinition {
  label: string;
  category: 'doors' | 'windows';
  defaultWidthMm: number;
  defaultThicknessMm: number;
  color: string;
}

export const OPENING_DEFINITIONS: Record<OpeningKind, OpeningDefinition> = {
  single_door: { label: 'Single door', category: 'doors', defaultWidthMm: 914.4, defaultThicknessMm: 114.3, color: '#3b82f6' },
  double_door: { label: 'Double door', category: 'doors', defaultWidthMm: 1524, defaultThicknessMm: 114.3, color: '#3b82f6' },
  sliding_door: { label: 'Sliding door', category: 'doors', defaultWidthMm: 1524, defaultThicknessMm: 114.3, color: '#3b82f6' },
  bifold_door: { label: 'Bifold door', category: 'doors', defaultWidthMm: 1219.2, defaultThicknessMm: 114.3, color: '#3b82f6' },
  standard_window: { label: 'Window', category: 'windows', defaultWidthMm: 914.4, defaultThicknessMm: 114.3, color: '#06b6d4' },
  large_window: { label: 'Large window', category: 'windows', defaultWidthMm: 1524, defaultThicknessMm: 114.3, color: '#06b6d4' },
  sliding_window: { label: 'Sliding window', category: 'windows', defaultWidthMm: 1219.2, defaultThicknessMm: 114.3, color: '#06b6d4' },
};

export const DEFAULT_DOOR_TYPE: DoorType = 'single_door';
export const DEFAULT_WINDOW_TYPE: WindowType = 'standard_window';

export function isDoorType(value: unknown): value is DoorType {
  return typeof value === 'string' && (DOOR_TYPES as readonly string[]).includes(value);
}

export function isWindowType(value: unknown): value is WindowType {
  return typeof value === 'string' && (WINDOW_TYPES as readonly string[]).includes(value);
}
