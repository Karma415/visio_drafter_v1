import type { DrawingDocument, Shape, ShapePoint } from './document';
import { MAX_DISTANCE_MM, MAX_POINTS_PER_SHAPE, MAX_SHAPES, MAX_TEXT_LENGTH, MIN_SIZE_MM } from './document';
import { isWallType } from './walls';
import { isFurnitureKind } from './furniture';
import { isDoorType, isWindowType } from './doors';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a drawing object.');
  return value as Record<string, unknown>;
}
function finite(value: unknown, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`Measurement must be between ${minimum} and ${maximum} mm.`);
  }
  return value;
}
function string(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || value.length > maximum) throw new Error('Invalid or oversized text field.');
  return value;
}
function points(value: unknown, type: Shape['type']): ShapePoint[] | undefined {
  const needsPoints = type === 'line' || type === 'polyline' || type === 'polygon' || type === 'wall' || type === 'measurement';
  if (value === undefined && !needsPoints) return undefined;
  if (!Array.isArray(value) || value.length > MAX_POINTS_PER_SHAPE) throw new Error('Invalid point list.');
  const minimum = type === 'polygon' ? 3 : type === 'line' || type === 'polyline' || type === 'wall' || type === 'measurement' ? 2 : 0;
  if (value.length < minimum) throw new Error('This shape needs more points.');
  return value.map((point) => {
    const item = record(point);
    return { x: finite(item.x, -MAX_DISTANCE_MM, MAX_DISTANCE_MM), y: finite(item.y, -MAX_DISTANCE_MM, MAX_DISTANCE_MM) };
  });
}

export function validateShape(value: unknown): Shape {
  const item = record(value);
  if (!['rectangle', 'square', 'circle', 'ellipse', 'triangle', 'line', 'polyline', 'polygon', 'arc', 'text', 'wall', 'measurement', 'furniture', 'door', 'window'].includes(String(item.type))) throw new Error('Unsupported shape type.');
  const type = item.type as Shape['type'];
  const id = string(item.id, 100);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Invalid shape ID.');
  const fill = string(item.fill, 9);
  if (!/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(fill)) throw new Error('Use a hexadecimal shape color.');
  const wall = type === 'wall'
    ? (() => {
      if (!isWallType(item.wallType)) throw new Error('Unsupported wall type.');
      return { wallType: item.wallType, wallThicknessMm: finite(item.wallThicknessMm, MIN_SIZE_MM, MAX_DISTANCE_MM) };
    })()
    : {};
  const furniture = type === 'furniture'
    ? (() => {
      if (!isFurnitureKind(item.furnitureKind)) throw new Error('Unsupported furniture type.');
      return { furnitureKind: item.furnitureKind };
    })()
    : {};
  const door = type === 'door'
    ? (() => {
      if (!isDoorType(item.doorType)) throw new Error('Unsupported door type.');
      const swingHinge = item.swingHinge === 'right' ? 'right' : 'left';
      const swingDirection = item.swingDirection === 'outside' ? 'outside' : 'inside';
      return { doorType: item.doorType, swingHinge, swingDirection };
    })()
    : {};
  const windowOpening = type === 'window'
    ? (() => {
      if (!isWindowType(item.windowType)) throw new Error('Unsupported window type.');
      return { windowType: item.windowType };
    })()
    : {};
  return {
    id, type, fill,
    x: finite(item.x, -MAX_DISTANCE_MM, MAX_DISTANCE_MM),
    y: finite(item.y, -MAX_DISTANCE_MM, MAX_DISTANCE_MM),
    width: finite(item.width, MIN_SIZE_MM, MAX_DISTANCE_MM),
    height: finite(item.height, MIN_SIZE_MM, MAX_DISTANCE_MM),
    ...(item.text === undefined ? {} : { text: string(item.text, MAX_TEXT_LENGTH) }),
    ...(item.rotation === undefined ? {} : { rotation: finite(item.rotation, -36000, 36000) }),
    ...(item.startAngle === undefined ? {} : { startAngle: finite(item.startAngle, -36000, 36000) }),
    ...(item.endAngle === undefined ? {} : { endAngle: finite(item.endAngle, -36000, 36000) }),
    ...wall,
    ...furniture,
    ...door,
    ...windowOpening,
    ...(points(item.points, type) ? { points: points(item.points, type) } : {}),
  };
}

/** Rebuild an allowlisted document; never merge an imported object into application state. */
export function validateDocument(value: unknown): DrawingDocument {
  const item = record(value);
  if (item.format !== 'karma-draft' || item.version !== 1 || item.units !== 'mm' || item.paperScale !== 25) {
    throw new Error('Unsupported drawing format. Pixel-based sketches must be explicitly calibrated before import.');
  }
  if (item.displayUnit !== 'mm' && item.displayUnit !== 'cm') throw new Error('Unsupported display unit.');
  if (!Array.isArray(item.shapes) || item.shapes.length > MAX_SHAPES) throw new Error(`Drawings support up to ${MAX_SHAPES} shapes.`);
  const shapes = item.shapes.map(validateShape);
  if (new Set(shapes.map((shape) => shape.id)).size !== shapes.length) throw new Error('Duplicate shape IDs.');
  return {
    format: 'karma-draft', version: 1, units: 'mm', paperScale: 25,
    name: string(item.name, 120), displayUnit: item.displayUnit,
    gridMm: finite(item.gridMm, MIN_SIZE_MM, 25400), shapes,
  };
}
