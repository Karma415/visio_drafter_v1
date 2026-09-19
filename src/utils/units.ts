export type DisplayUnit = 'inches' | 'feet' | 'millimeters' | 'meters';

export function parseInputToMm(input: string, currentUnit: DisplayUnit, fallbackCurrentMm: number): number {
  if (!input || input.trim() === '') return fallbackCurrentMm;
  
  const text = input.toLowerCase().trim();
  
  // Check for explicit units
  let totalInches = 0;
  let hasImperialUnit = false;
  
  const feetMatch = text.match(/([\d.]+)\s*(?:'|ft|feet)/);
  if (feetMatch) {
    totalInches += parseFloat(feetMatch[1]) * 12;
    hasImperialUnit = true;
  }
  
  const inchesMatch = text.match(/([\d.]+)\s*(?:"|in|inches)/);
  if (inchesMatch) {
    totalInches += parseFloat(inchesMatch[1]);
    hasImperialUnit = true;
  }

  if (hasImperialUnit) {
    return totalInches * 25.4;
  }

  const mMatch = text.match(/([\d.]+)\s*(?:m|meters?)$/);
  if (mMatch) return parseFloat(mMatch[1]) * 1000;

  const cmMatch = text.match(/([\d.]+)\s*(?:cm|centimeters?)$/);
  if (cmMatch) return parseFloat(cmMatch[1]) * 10;

  const mmMatch = text.match(/([\d.]+)\s*(?:mm|millimeters?)$/);
  if (mmMatch) return parseFloat(mmMatch[1]);

  // If no unit is specified, treat it as the current global display unit
  const val = parseFloat(text);
  if (isNaN(val)) return fallbackCurrentMm;

  switch (currentUnit) {
    case 'inches': return val * 25.4;
    case 'feet': return val * 304.8;
    case 'meters': return val * 1000;
    case 'millimeters': return val;
    default: return val;
  }
}

export function formatMmToUnit(mm: number, unit: DisplayUnit): string {
  // Try to avoid excessive decimals if it's an exact whole number
  const round = (num: number) => {
    const str = num.toFixed(2);
    return str.endsWith('.00') ? str.slice(0, -3) : str;
  };

  switch (unit) {
    case 'inches': return round(mm / 25.4);
    case 'feet': return round(mm / 304.8);
    case 'meters': return round(mm / 1000);
    case 'millimeters': return Math.round(mm).toString();
    default: return Math.round(mm).toString();
  }
}
