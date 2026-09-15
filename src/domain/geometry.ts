import type { Bounds, Shape, ShapePoint } from './document';
import { MIN_SIZE_MM } from './document';

export interface Point { x: number; y: number }
export const snap = (value: number, grid: number) => Math.round(value / grid) * grid;
export const screenToWorld = (point: Point, position: Point, scale: number): Point => ({
  x: (point.x - position.x) / scale,
  y: (point.y - position.y) / scale,
});
export function nodePosition(shape: Shape): Point {
  return isCenteredShape(shape)
    ? { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 }
    : { x: shape.x, y: shape.y };
}

export function isCenteredShape(shape: Shape): boolean {
  return ['circle', 'ellipse', 'triangle', 'arc'].includes(shape.type);
}

export function isProportionalShape(shape: Shape): boolean {
  // Square and ellipse are retained only for older saved drawings. New shapes
  // use rectangle/circle, and users may freely change either dimension.
  void shape;
  return false;
}

export function hasPoints(shape: Shape): shape is Shape & { points: ShapePoint[] } {
  return Boolean(shape.points?.length);
}

export function boundsFromPoints(points: ShapePoint[]): Bounds {
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  return { x: minX, y: minY, width: Math.max(MIN_SIZE_MM, maxX - minX), height: Math.max(MIN_SIZE_MM, maxY - minY) };
}

export function normalizePoints(points: ShapePoint[]): { bounds: Bounds; points: ShapePoint[] } {
  const bounds = boundsFromPoints(points);
  return { bounds, points: points.map((point) => ({ x: point.x - bounds.x, y: point.y - bounds.y })) };
}

export function resizePoints(points: ShapePoint[], oldBounds: Bounds, nextBounds: Bounds): ShapePoint[] {
  const scaleX = nextBounds.width / oldBounds.width;
  const scaleY = nextBounds.height / oldBounds.height;
  return points.map((point) => ({ x: point.x * scaleX, y: point.y * scaleY }));
}

/** Candidate corners, centers, and line vertices in actual millimeters. */
export function shapeSnapPoints(shape: Shape): ShapePoint[] {
  const corners = [
    { x: shape.x, y: shape.y },
    { x: shape.x + shape.width, y: shape.y },
    { x: shape.x, y: shape.y + shape.height },
    { x: shape.x + shape.width, y: shape.y + shape.height },
    { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 },
  ];
  return shape.points ? [...corners, ...shape.points.map((point) => ({ x: shape.x + point.x, y: shape.y + point.y }))] : corners;
}

export type SnapKind = 'object' | 'wall' | 'grid';
export interface SnapResult { point: ShapePoint; kind: SnapKind }

/** Prefer a nearby object anchor; otherwise preserve ordinary physical grid snapping. */
export function snapToDrawingPointWithKind(point: ShapePoint, shapes: Shape[], gridMm: number, thresholdMm: number, excludeId?: string): SnapResult {
  let nearest: ShapePoint | null = null;
  let nearestDistance = thresholdMm;
  for (const shape of shapes) {
    if (shape.id === excludeId) continue;
    for (const candidate of shapeSnapPoints(shape)) {
      const distance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
      if (distance <= nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }
  }
  return nearest
    ? { point: nearest, kind: 'object' }
    : { point: { x: snap(point.x, gridMm), y: snap(point.y, gridMm) }, kind: 'grid' };
}

export function snapToDrawingPoint(point: ShapePoint, shapes: Shape[], gridMm: number, thresholdMm: number, excludeId?: string): ShapePoint {
  return snapToDrawingPointWithKind(point, shapes, gridMm, thresholdMm, excludeId).point;
}

function worldWallPoints(shape: Shape): ShapePoint[] {
  return shape.type === 'wall'
    ? (shape.points ?? []).map((point) => ({ x: shape.x + point.x, y: shape.y + point.y }))
    : [];
}

/** Closest point on a finite wall centerline, not its infinite extension. */
export function closestPointOnSegment(point: ShapePoint, start: ShapePoint, end: ShapePoint): ShapePoint {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const denominator = dx ** 2 + dy ** 2;
  if (denominator === 0) return start;
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / denominator));
  return { x: start.x + dx * ratio, y: start.y + dy * ratio };
}

/**
 * The visible face nearest a connecting wall endpoint. Wall paths are stored
 * as centerlines; this converts a finite centerline point into one side face.
 */
function nearestWallFace(centerlinePoint: ShapePoint, connectingPoint: ShapePoint, start: ShapePoint, end: ShapePoint, thicknessMm: number): ShapePoint {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return centerlinePoint;
  const normal = { x: -dy / length, y: dx / length };
  const side = (connectingPoint.x - centerlinePoint.x) * normal.x + (connectingPoint.y - centerlinePoint.y) * normal.y;
  const direction = side >= 0 ? 1 : -1;
  return {
    x: centerlinePoint.x + normal.x * thicknessMm / 2 * direction,
    y: centerlinePoint.y + normal.y * thicknessMm / 2 * direction,
  };
}

/** Nearest visible face for measurement endpoints that have no direction yet. */
export function snapToWallFace(point: ShapePoint, shapes: Shape[], gridMm: number, thresholdMm: number): SnapResult {
  const ordinary = snapToDrawingPointWithKind(point, shapes, gridMm, thresholdMm);
  let candidate: ShapePoint | null = null;
  let closestDistance = thresholdMm;
  for (const shape of shapes) {
    if (shape.type !== 'wall') continue;
    const [start, end] = worldWallPoints(shape);
    if (!start || !end) continue;
    const centerlinePoint = closestPointOnSegment(point, start, end);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;
    const normal = { x: -dy / length, y: dx / length };
    const offset = (shape.wallThicknessMm ?? 101.6) / 2;
    for (const direction of [-1, 1]) {
      const face = { x: centerlinePoint.x + normal.x * offset * direction, y: centerlinePoint.y + normal.y * offset * direction };
      const distance = Math.hypot(face.x - point.x, face.y - point.y);
      if (distance <= closestDistance) {
        candidate = face;
        closestDistance = distance;
      }
    }
  }
  return candidate && (ordinary.kind === 'grid' || closestDistance <= Math.hypot(ordinary.point.x - point.x, ordinary.point.y - point.y))
    ? { point: candidate, kind: 'wall' }
    : ordinary;
}

export function distanceBetween(start: ShapePoint, end: ShapePoint): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

export function wallLength(shape: Shape): number {
  if (shape.type !== 'wall' || !shape.points || shape.points.length < 2) return 0;
  return distanceBetween(shape.points[0], shape.points[1]);
}

/**
 * Changes a wall's centerline length while preserving its first endpoint and
 * direction. The root-origin adjustment keeps that promise after rotation.
 */
export function resizeWallToLength(shape: Shape, nextLengthMm: number, nextRotation = shape.rotation ?? 0): { bounds: Bounds; points: ShapePoint[] } {
  if (shape.type !== 'wall' || !shape.points || shape.points.length < 2 || !Number.isFinite(nextLengthMm) || nextLengthMm < MIN_SIZE_MM) {
    throw new Error('Enter a positive wall length.');
  }
  const [start, end] = shape.points;
  const currentLength = distanceBetween(start, end);
  if (currentLength < MIN_SIZE_MM) throw new Error('This wall has no usable direction.');
  const rawPoints = [start, {
    x: start.x + (end.x - start.x) / currentLength * nextLengthMm,
    y: start.y + (end.y - start.y) / currentLength * nextLengthMm,
  }];
  const normalized = normalizePoints(rawPoints);
  const oldRadians = (shape.rotation ?? 0) * Math.PI / 180;
  const newRadians = nextRotation * Math.PI / 180;
  const originalFirstEndpoint = {
    x: shape.x + start.x * Math.cos(oldRadians) - start.y * Math.sin(oldRadians),
    y: shape.y + start.x * Math.sin(oldRadians) + start.y * Math.cos(oldRadians),
  };
  const nextFirstEndpoint = normalized.points[0];
  const shiftedOrigin = {
    x: originalFirstEndpoint.x - nextFirstEndpoint.x * Math.cos(newRadians) + nextFirstEndpoint.y * Math.sin(newRadians),
    y: originalFirstEndpoint.y - nextFirstEndpoint.x * Math.sin(newRadians) - nextFirstEndpoint.y * Math.cos(newRadians),
  };
  return {
    bounds: { ...normalized.bounds, x: shiftedOrigin.x, y: shiftedOrigin.y },
    points: normalized.points,
  };
}

/**
 * Wall endpoint snapping adds centerline joins (including T-junctions) while
 * preserving the ordinary shape-anchor and physical-grid fallback.
 */
export function snapToWallPoint(point: ShapePoint, shapes: Shape[], gridMm: number, thresholdMm: number, excludeId?: string): SnapResult {
  const ordinary = snapToDrawingPointWithKind(point, shapes, gridMm, thresholdMm, excludeId);
  let candidate: ShapePoint | null = null;
  let closestDistance = thresholdMm;
  for (const shape of shapes) {
    if (shape.id === excludeId || shape.type !== 'wall') continue;
    const [start, end] = worldWallPoints(shape);
    if (!start || !end) continue;
    const closest = closestPointOnSegment(point, start, end);
    const distance = Math.hypot(closest.x - point.x, closest.y - point.y);
    if (distance <= closestDistance) {
      candidate = closest;
      closestDistance = distance;
    }
  }
  return candidate && (ordinary.kind === 'grid' || closestDistance <= Math.hypot(ordinary.point.x - point.x, ordinary.point.y - point.y))
    ? { point: candidate, kind: 'wall' }
    : ordinary;
}

/** Snap a wall's second endpoint to the visible face of another wall. */
export function snapWallEndpoint(point: ShapePoint, fixedEndpoint: ShapePoint, shapes: Shape[], gridMm: number, thresholdMm: number, excludeId?: string): SnapResult {
  const ordinary = snapToWallPoint(point, shapes, gridMm, thresholdMm, excludeId);
  let candidate: ShapePoint | null = null;
  let closestDistance = thresholdMm;
  for (const shape of shapes) {
    if (shape.id === excludeId || shape.type !== 'wall') continue;
    const [start, end] = worldWallPoints(shape);
    if (!start || !end) continue;
    const centerlinePoint = closestPointOnSegment(point, start, end);
    const face = nearestWallFace(centerlinePoint, fixedEndpoint, start, end, shape.wallThicknessMm ?? 101.6);
    const distance = Math.hypot(face.x - point.x, face.y - point.y);
    if (distance <= closestDistance) {
      candidate = face;
      closestDistance = distance;
    }
  }
  return candidate && (ordinary.kind === 'grid' || closestDistance <= Math.hypot(ordinary.point.x - point.x, ordinary.point.y - point.y))
    ? { point: candidate, kind: 'wall' }
    : ordinary;
}

/**
 * Aligns any unrotated bounding-box anchor of the dragged shape to a nearby
 * anchor on another shape. This makes corner-to-corner snapping perceptible,
 * rather than only snapping the dragged shape's top-left origin.
 */
export function snapShapeOrigin(origin: ShapePoint, draggedShape: Shape, shapes: Shape[], gridMm: number, thresholdMm: number): SnapResult {
  const localAnchors = shapeSnapPoints({ ...draggedShape, x: 0, y: 0 });
  let result: ShapePoint | null = null;
  let nearestDistance = thresholdMm;

  for (const shape of shapes) {
    if (shape.id === draggedShape.id) continue;
    for (const target of shapeSnapPoints(shape)) {
      for (const localAnchor of localAnchors) {
        const candidate = { x: origin.x + localAnchor.x, y: origin.y + localAnchor.y };
        const distance = Math.hypot(target.x - candidate.x, target.y - candidate.y);
        if (distance <= nearestDistance) {
          result = { x: target.x - localAnchor.x, y: target.y - localAnchor.y };
          nearestDistance = distance;
        }
      }
    }
  }
  return result
    ? { point: result, kind: 'object' }
    : { point: { x: snap(origin.x, gridMm), y: snap(origin.y, gridMm) }, kind: 'grid' };
}

/** Move a whole wall so either endpoint joins another wall's centerline. */
export function snapWallOrigin(origin: ShapePoint, draggedWall: Shape, shapes: Shape[], gridMm: number, thresholdMm: number): SnapResult {
  const localEndpoints = worldWallPoints({ ...draggedWall, x: 0, y: 0 });
  let result: ShapePoint | null = null;
  let closestDistance = thresholdMm;
  for (const shape of shapes) {
    if (shape.id === draggedWall.id || shape.type !== 'wall') continue;
    const [start, end] = worldWallPoints(shape);
    if (!start || !end) continue;
    for (const [index, endpoint] of localEndpoints.entries()) {
      const movedEndpoint = { x: origin.x + endpoint.x, y: origin.y + endpoint.y };
      const otherEndpoint = localEndpoints[index === 0 ? 1 : 0];
      if (!otherEndpoint) continue;
      const movedOtherEndpoint = { x: origin.x + otherEndpoint.x, y: origin.y + otherEndpoint.y };
      const centerlinePoint = closestPointOnSegment(movedEndpoint, start, end);
      const face = nearestWallFace(centerlinePoint, movedOtherEndpoint, start, end, shape.wallThicknessMm ?? 101.6);
      const distance = Math.hypot(face.x - movedEndpoint.x, face.y - movedEndpoint.y);
      if (distance <= closestDistance) {
        result = { x: face.x - endpoint.x, y: face.y - endpoint.y };
        closestDistance = distance;
      }
    }
  }
  return result
    ? { point: result, kind: 'wall' }
    : snapShapeOrigin(origin, draggedWall, shapes, gridMm, thresholdMm);
}
export function snappedBounds(bounds: Bounds, grid: number): Bounds {
  return {
    x: snap(bounds.x, grid), y: snap(bounds.y, grid),
    width: Math.max(MIN_SIZE_MM, grid, snap(bounds.width, grid)),
    height: Math.max(MIN_SIZE_MM, grid, snap(bounds.height, grid)),
  };
}

/** Thin the visible grid at distant zoom levels without changing the snap interval. */
export function visibleGridStep(gridMm: number, pixelsPerMm: number): number {
  return gridMm * 2 ** Math.max(0, Math.ceil(Math.log2(12 / (gridMm * pixelsPerMm))));
}
