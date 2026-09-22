export type MeasurementUnit = 'in' | 'ft' | 'mm' | 'cm' | 'm';

export function parseInputToMm(input: string, currentUnit: MeasurementUnit, fallbackCurrentMm: number, drawingScale: number = 1): number {
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
    return (totalInches * 25.4) / drawingScale;
  }

  const mMatch = text.match(/([\d.]+)\s*(?:m|meters?)$/);
  if (mMatch) return (parseFloat(mMatch[1]) * 1000) / drawingScale;

  const cmMatch = text.match(/([\d.]+)\s*(?:cm|centimeters?)$/);
  if (cmMatch) return (parseFloat(cmMatch[1]) * 10) / drawingScale;

  const mmMatch = text.match(/([\d.]+)\s*(?:mm|millimeters?)$/);
  if (mmMatch) return parseFloat(mmMatch[1]) / drawingScale;

  // If no unit is specified, treat it as the current global display unit
  const val = parseFloat(text);
  if (isNaN(val)) return fallbackCurrentMm;

  let result = val;
  switch (currentUnit) {
    case 'in': result = val * 25.4; break;
    case 'ft': result = val * 304.8; break;
    case 'm': result = val * 1000; break;
    case 'cm': result = val * 10; break;
    case 'mm': result = val; break;
  }
  return result / drawingScale;
}

export function formatMmToUnit(mm: number, unit: MeasurementUnit, drawingScale: number = 1): string {
  // Try to avoid excessive decimals if it's an exact whole number
  const round = (num: number) => {
    const str = num.toFixed(2);
    return str.endsWith('.00') ? str.slice(0, -3) : str;
  };

  const scaled = mm * drawingScale;
  switch (unit) {
    case 'in': return round(scaled / 25.4);
    case 'ft': return round(scaled / 304.8);
    case 'm': return round(scaled / 1000);
    case 'cm': return round(scaled / 10);
    case 'mm': return Math.round(scaled).toString();
    default: return Math.round(scaled).toString();
  }
}
