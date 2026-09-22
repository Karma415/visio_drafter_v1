import type { Shape, ShapePoint } from './document';
import { flatShapePoints, getShapePoints } from './document';
import { isCenteredShape, normalizePoints, proximityBounds } from './geometry';

export type Alignment = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'middle';
export type DistributionAxis = 'horizontal' | 'vertical';

export function alignShapes(shapes: Shape[], alignment: Alignment): Shape[] {
  if (shapes.length < 2) return shapes;
  const axis = (alignment === 'left' || alignment === 'right' || alignment === 'center') ? 'x' : 'y';
  const size = axis === 'x' ? 'width' : 'height';
  const trailing = alignment === 'right' || alignment === 'bottom';
  const middle = alignment === 'center' || alignment === 'middle';
  const edges = shapes.map(shape => {
    const bounds = proximityBounds(shape);
    return bounds[axis] + (trailing ? bounds[size] : (middle ? bounds[size] / 2 : 0));
  });
  
  let target;
  if (middle) {
    const starts = shapes.map(s => proximityBounds(s)[axis]);
    const ends = shapes.map(s => proximityBounds(s)[axis] + proximityBounds(s)[size]);
    target = (Math.min(...starts) + Math.max(...ends)) / 2;
  } else {
    target = trailing ? Math.max(...edges) : Math.min(...edges);
  }
  
  return shapes.map((shape, index) => ({ ...shape, [axis]: shape[axis] + target - edges[index] }));
}

/** Automatic spacing fixes the outside edges; an explicit gap fixes the first item. */
export function distributeShapes(shapes: Shape[], axis: DistributionAxis, gapMm?: number): Shape[] {
  if (gapMm !== undefined && (!Number.isFinite(gapMm) || gapMm < 0)) throw new Error('Spacing must be a finite, non-negative distance.');
  if (shapes.length < 3) return shapes;
  const coordinate = axis === 'horizontal' ? 'x' : 'y';
  const size = axis === 'horizontal' ? 'width' : 'height';
  const entries = shapes.map(shape => ({ shape, bounds: proximityBounds(shape) }))
    .sort((a, b) => a.bounds[coordinate] - b.bounds[coordinate]);
  const first = entries[0].bounds[coordinate];
  const last = entries[entries.length - 1].bounds;
  const gap = gapMm ?? (last[coordinate] + last[size] - first - entries.reduce((sum, entry) => sum + entry.bounds[size], 0)) / (entries.length - 1);
  let position = first;
  const changes = new Map(entries.map(({ shape, bounds }) => {
    const next = { ...shape, [coordinate]: shape[coordinate] + position - bounds[coordinate] };
    position += bounds[size] + gap;
    return [shape.id, next];
  }));
  return shapes.map(shape => changes.get(shape.id)!);
}

export interface ShapeTransform { position: ShapePoint; scaleX: number; scaleY: number; rotation: number }

/** Bake transformed paths into points so wall snapping continues to use world geometry. */
export function transformShape(shape: Shape, transform: ShapeTransform): Shape {
  const { position, scaleX, scaleY, rotation } = transform;
  if (![position.x, position.y, scaleX, scaleY, rotation].every(Number.isFinite) || scaleX <= 0 || scaleY <= 0) {
    throw new Error('Transform requires finite coordinates and positive scales.');
  }
  const points = getShapePoints(shape);
  if (points.length) {
    const angle = rotation * Math.PI / 180;
    const normalized = normalizePoints(points.map(point => {
      const x = point.x * scaleX;
      const y = point.y * scaleY;
      return { x: position.x + x * Math.cos(angle) - y * Math.sin(angle),
        y: position.y + x * Math.sin(angle) + y * Math.cos(angle) };
    }));
    return { ...shape, ...normalized.bounds, points: flatShapePoints(normalized.points), rotation: 0 };
  }
  const width = shape.width * scaleX;
  const height = shape.height * scaleY;
  return { ...shape, x: position.x - (isCenteredShape(shape) ? width / 2 : 0),
    y: position.y - (isCenteredShape(shape) ? height / 2 : 0), width, height, rotation };
}

export function circleWithRadius(shape: Shape, radiusMm: number): Shape {
  if (shape.type !== 'circle' || !Number.isFinite(radiusMm) || radiusMm <= 0) throw new Error('Circle radius must be positive.');
  return { ...shape, x: shape.x + shape.width / 2 - radiusMm, y: shape.y + shape.height / 2 - radiusMm,
    width: radiusMm * 2, height: radiusMm * 2 };
}
