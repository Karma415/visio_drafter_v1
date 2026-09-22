import type { DrawingDocument, Shape, Layer, Page } from './document';
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
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Expected boolean.');
  return value;
}

export function validateLayer(value: unknown): Layer {
  const item = record(value);
  return {
    id: string(item.id, 100),
    name: string(item.name, 100),
    isVisible: boolean(item.isVisible),
    isLocked: boolean(item.isLocked),
  };
}

export function validatePage(value: unknown): Page {
  const item = record(value);
  const id = item.id !== undefined ? string(item.id, 100) : crypto.randomUUID();
  const name = item.name !== undefined ? string(item.name, 100) : 'Page 1';
  if (!Array.isArray(item.shapes) || item.shapes.length > MAX_SHAPES) throw new Error(`Drawings support up to ${MAX_SHAPES} shapes.`);
  const layers = Array.isArray(item.layers) ? item.layers.map(validateLayer) : [{ id: 'default', name: 'Layer 1', isVisible: true, isLocked: false }];
  const shapes = item.shapes.map(validateShape);
  if (new Set(shapes.map((shape) => shape.id)).size !== shapes.length) throw new Error('Duplicate shape IDs.');
  return { id, name, shapes, layers };
}
function points(value: unknown, type: Shape['type']): number[] | undefined {
  const needsPoints = type === 'line' || type === 'polyline' || type === 'polygon' || type === 'wall' || type === 'measurement' || type === 'callout';
  if (value === undefined && !needsPoints) return undefined;
  if (!Array.isArray(value) || value.length > MAX_POINTS_PER_SHAPE * 2) throw new Error('Invalid point list.');
  const minimum = type === 'polygon' ? 6 : type === 'line' || type === 'polyline' || type === 'wall' || type === 'measurement' ? 4 : type === 'callout' ? 2 : 0;
  if (value.length < minimum) throw new Error('This shape needs more points.');
  return value.map((num) => {
    if (typeof num !== 'number') throw new Error('Points must be numbers');
    return finite(num, -MAX_DISTANCE_MM, MAX_DISTANCE_MM);
  });
}

export function validateShape(value: unknown): Shape {
  const item = record(value);
  if (!['rectangle', 'square', 'circle', 'ellipse', 'triangle', 'line', 'polyline', 'polygon', 'arc', 'text', 'callout', 'wall', 'measurement', 'furniture', 'door', 'window', 'spreadsheet', 'image', 'group', 'chart'].includes(String(item.type))) throw new Error('Unsupported shape type.');
  const type = item.type as Shape['type'];
  const id = string(item.id, 100);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Invalid shape ID.');
  const layerId = item.layerId !== undefined ? string(item.layerId, 100) : 'default';
  const fill = string(item.fill, 15);
  if (fill !== 'transparent' && !/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(fill)) throw new Error('Use a hexadecimal shape color or "transparent".');
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
    id, type, layerId, fill,
    x: finite(item.x, -MAX_DISTANCE_MM, MAX_DISTANCE_MM),
    y: finite(item.y, -MAX_DISTANCE_MM, MAX_DISTANCE_MM),
    width: finite(item.width, MIN_SIZE_MM, MAX_DISTANCE_MM),
    height: finite(item.height, MIN_SIZE_MM, MAX_DISTANCE_MM),
    ...(item.text === undefined ? {} : { text: string(item.text, MAX_TEXT_LENGTH) }),
    ...(item.fontSize === undefined ? {} : { fontSize: finite(item.fontSize, 1, 10000) }),
    ...(item.rotation === undefined ? {} : { rotation: finite(item.rotation, -36000, 36000) }),
    ...(item.startAngle === undefined ? {} : { startAngle: finite(item.startAngle, -36000, 36000) }),
    ...(item.endAngle === undefined ? {} : { endAngle: finite(item.endAngle, -36000, 36000) }),
    ...wall,
    ...furniture,
    ...door,
    ...windowOpening,
    ...(points(item.points, type) ? { points: points(item.points, type) } : {}),
    ...(item.stroke !== undefined ? { stroke: string(item.stroke, 15) } : {}),
    ...(item.strokeWidth !== undefined ? { strokeWidth: finite(item.strokeWidth, 0, 100) } : {}),
    ...(item.fillColor !== undefined ? { fillColor: string(item.fillColor, 50) } : {}),
    ...(item.strokeColor !== undefined ? { strokeColor: string(item.strokeColor, 50) } : {}),
    ...(item.opacity !== undefined ? { opacity: finite(item.opacity, 0, 1) } : {}),
    ...(item.shadowColor !== undefined ? { shadowColor: string(item.shadowColor, 50) } : {}),
    ...(item.shadowBlur !== undefined ? { shadowBlur: finite(item.shadowBlur, 0, 100) } : {}),
    ...(item.shadowOffsetX !== undefined ? { shadowOffsetX: finite(item.shadowOffsetX, -1000, 1000) } : {}),
    ...(item.shadowOffsetY !== undefined ? { shadowOffsetY: finite(item.shadowOffsetY, -1000, 1000) } : {}),
    ...(item.imageUrl !== undefined ? { imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined } : {}),
    ...(item.groupChildren !== undefined ? { groupChildren: Array.isArray(item.groupChildren) ? item.groupChildren.map(validateShape) : undefined } : {}),
    ...(item.chartData !== undefined ? { chartData: typeof item.chartData === 'string' ? item.chartData : undefined } : {}),
    ...(item.chartType !== undefined ? { chartType: item.chartType === 'bar' || item.chartType === 'pie' ? item.chartType : undefined } : {}),
    ...(item.spreadsheetData !== undefined ? { spreadsheetData: Array.isArray(item.spreadsheetData) ? item.spreadsheetData.map((row: any) => Array.isArray(row) ? row.map((cell: any) => String(cell || '')) : []) : undefined } : {}),
  };
}

/** Rebuild an allowlisted document; never merge an imported object into application state. */
export function validateDocument(value: unknown): DrawingDocument {
  const item = record(value);
  if (item.format !== 'karma-draft' || item.version !== 1 || item.units !== 'mm' || item.paperScale !== 25) {
    throw new Error('Unsupported drawing format. Pixel-based sketches must be explicitly calibrated before import.');
  }
  if (item.measurementUnit !== 'mm' && item.measurementUnit !== 'cm') throw new Error('Unsupported display unit.');
  
  let pages: Page[];
  if (Array.isArray(item.pages)) {
    pages = item.pages.map(validatePage);
  } else {
    // legacy migration
    if (!Array.isArray(item.shapes) || item.shapes.length > MAX_SHAPES) throw new Error(`Drawings support up to ${MAX_SHAPES} shapes.`);
    const layers = Array.isArray(item.layers) ? item.layers.map(validateLayer) : [{ id: 'default', name: 'Layer 1', isVisible: true, isLocked: false }];
    const shapes = item.shapes.map(validateShape);
    if (new Set(shapes.map((shape) => shape.id)).size !== shapes.length) throw new Error('Duplicate shape IDs.');
    pages = [{ id: 'default-page', name: 'Page 1', shapes, layers }];
  }

  return {
    format: 'karma-draft', version: 1, units: 'mm', paperScale: 25,
    name: string(item.name, 120), measurementUnit: item.measurementUnit,
    clientName: item.clientName ? string(item.clientName, 120) : undefined,
    architectName: item.architectName ? string(item.architectName, 120) : undefined,
    projectAddress: item.projectAddress ? string(item.projectAddress, 200) : undefined,
    projectDate: item.projectDate ? string(item.projectDate, 50) : undefined,
    gridMm: finite(item.gridMm, MIN_SIZE_MM, 25400), pages,
  };
}
