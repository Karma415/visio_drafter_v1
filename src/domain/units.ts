export const MM_PER_INCH = 25.4;
export const inchesToMm = (inches: number) => inches * MM_PER_INCH;
export const mmToInches = (mm: number) => mm / MM_PER_INCH;
export const paperMm = (actualMm: number, scale = 25) => actualMm / scale;

/** Accept decimal inches, simple fractions, or mixed fractions; never evaluate input. */
export function parseInches(input: string): number {
  const value = input.trim().replace(/\s*(?:in|inches|")$/i, '').trim();
  const match = /^([+-]?)(?:(\d+)\s+)?(\d+)\/(\d+)$/.exec(value);
  let result: number;
  if (match) {
    const denominator = Number(match[4]);
    if (denominator === 0) throw new Error('The fraction denominator cannot be zero.');
    result = (Number(match[2] ?? 0) + Number(match[3]) / denominator) * (match[1] === '-' ? -1 : 1);
  } else {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
      throw new Error('Enter inches such as 12, 12.375, or 12 3/8.');
    }
    result = Number(value);
  }
  if (!Number.isFinite(result)) throw new Error('Enter a finite measurement.');
  return result;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value);
}

export function formatMetric(mm: number, unit: 'mm' | 'cm'): string {
  return `${formatNumber(unit === 'cm' ? mm / 10 : mm)} ${unit}`;
}
