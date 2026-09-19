import type { Bounds, Shape, ShapePoint, DrawingDocument } from './document';
import { getShapePoints, MIN_SIZE_MM } from './document';

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
  const pts = getShapePoints(shape);
  return pts.length > 0 ? [...corners, ...pts.map((point) => ({ x: shape.x + point.x, y: shape.y + point.y }))] : corners;
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
    ? getShapePoints(shape).map((point) => ({ x: shape.x + point.x, y: shape.y + point.y }))
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

export function getBoundarySnapPoint(targetCenter: ShapePoint, approachPoint: ShapePoint, start: ShapePoint, end: ShapePoint, thickness: number): ShapePoint {
  const wallDx = end.x - start.x;
  const wallDy = end.y - start.y;
  const wallLength = Math.hypot(wallDx, wallDy);
  if (wallLength === 0) return { x: targetCenter.x, y: targetCenter.y };

  const normalX = -wallDy / wallLength;
  const normalY = wallDx / wallLength;
  const approachSide =
    (approachPoint.x - targetCenter.x) * normalX +
    (approachPoint.y - targetCenter.y) * normalY;
  const signedOffset = (approachSide >= 0 ? 1 : -1) * (thickness / 2);

  return {
    x: targetCenter.x + normalX * signedOffset,
    y: targetCenter.y + normalY * signedOffset,
  };
}

/**
 * The visible face nearest a connecting wall endpoint. Wall paths are stored
 * as centerlines; this converts a finite centerline point into one side face.
 */
export function nearestWallFace(centerlinePoint: ShapePoint, connectingPoint: ShapePoint, start: ShapePoint, end: ShapePoint, thicknessMm: number): ShapePoint {
  return getBoundarySnapPoint(centerlinePoint, connectingPoint, start, end, thicknessMm);
}

/** Nearest visible face for measurement endpoints that have no direction yet. */
export function snapToWallFace(point: ShapePoint, shapes: Shape[], gridMm: number, thresholdMm: number): SnapResult {
  // Exclude walls from ordinary snapping so we don't accidentally snap to a wall's centerline/endpoint
  const nonWallShapes = shapes.filter(s => s.type !== 'wall');
  const ordinary = snapToDrawingPointWithKind(point, nonWallShapes, gridMm, thresholdMm);
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
  const pts = getShapePoints(shape);
  if (shape.type !== 'wall' || pts.length < 2) return 0;
  return distanceBetween(pts[0], pts[1]);
}

/**
 * Changes a wall's centerline length while preserving its first endpoint and
 * direction. The root-origin adjustment keeps that promise after rotation.
 */
export function resizeWallToLength(shape: Shape, nextLengthMm: number, targetAngleDeg: number): { bounds: Bounds; points: ShapePoint[]; rotation: number } {
  const pts = getShapePoints(shape);
  if (shape.type !== 'wall' || pts.length < 2 || !Number.isFinite(nextLengthMm) || nextLengthMm < MIN_SIZE_MM) {
    return { bounds: { x: shape.x, y: shape.y, width: shape.width, height: shape.height }, points: pts, rotation: shape.rotation ?? 0 };
  }
  
  const start = pts[0];
  const end = pts[1];
  
  // 1. Calculate current length and angle of the FIRST segment
  const currentLength = distanceBetween(start, end);
  if (currentLength < MIN_SIZE_MM) throw new Error('This wall has no usable direction.');
  
  const currentAngleRad = Math.atan2(end.y - start.y, end.x - start.x);
  
  // 2. We want to physically rotate all points around `start` by the difference between targetAngle and currentAngle.
  // Wait, if the shape had a Konva rotation previously, its true world angle was (currentAngle + shape.rotation).
  const worldCurrentAngleDeg = (currentAngleRad * 180 / Math.PI) + (shape.rotation ?? 0);
  let deltaDeg = targetAngleDeg - worldCurrentAngleDeg;
  const deltaRad = deltaDeg * Math.PI / 180;
  
  // 3. Scale factor for the first segment
  const scale = nextLengthMm / currentLength;
  
  // 4. Update points
  const rawPoints = pts.map((p) => {
    // We only scale the distance of the FIRST segment if requested.
    // For a multi-segment wall, stretching just the first segment might detach it from the rest,
    // so we scale the whole polyline relative to start.
    const dx = (p.x - start.x) * scale;
    const dy = (p.y - start.y) * scale;
    
    // Rotate
    const rx = dx * Math.cos(deltaRad) - dy * Math.sin(deltaRad);
    const ry = dx * Math.sin(deltaRad) + dy * Math.cos(deltaRad);
    
    return { x: start.x + rx, y: start.y + ry };
  });
  
  const normalized = normalizePoints(rawPoints);
  
  // 5. Keep the original world coordinate of the start point
  const oldRadians = (shape.rotation ?? 0) * Math.PI / 180;
  const originalWorldStart = {
    x: shape.x + start.x * Math.cos(oldRadians) - start.y * Math.sin(oldRadians),
    y: shape.y + start.x * Math.sin(oldRadians) + start.y * Math.cos(oldRadians),
  };
  
  // New normalized points have NO Konva rotation, so their world start is just shape.x + points[0].x
  const shiftedOrigin = {
    x: originalWorldStart.x - normalized.points[0].x,
    y: originalWorldStart.y - normalized.points[0].y,
  };
  
  return {
    bounds: { ...normalized.bounds, x: shiftedOrigin.x, y: shiftedOrigin.y },
    points: normalized.points,
    rotation: 0 // We physically baked the rotation into the points!
  };
}

/**
 * Wall endpoint snapping targets visible faces (including T-junctions) while
 * preserving the ordinary shape-anchor and physical-grid fallback.
 */
export function snapToWallPoint(point: ShapePoint, shapes: Shape[], gridMm: number, thresholdMm: number, excludeId?: string): SnapResult {
  const ordinary = snapToDrawingPointWithKind(point, shapes.filter(shape => shape.type !== 'wall'), gridMm, thresholdMm, excludeId);
  let candidate: ShapePoint | null = null;
  let closestDistance = thresholdMm;
  for (const shape of shapes) {
    if (shape.id === excludeId || shape.type !== 'wall') continue;
    const [start, end] = worldWallPoints(shape);
    if (!start || !end) continue;
    const closest = closestPointOnSegment(point, start, end);
    const face = getBoundarySnapPoint(closest, point, start, end, shape.wallThicknessMm ?? 101.6);
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

/** Snap a wall's second endpoint to the target face toward its fixed endpoint. */
export function snapWallEndpoint(point: ShapePoint, fixedEndpoint: ShapePoint, shapes: Shape[], gridMm: number, thresholdMm: number, excludeId?: string): SnapResult {
  const ordinary = snapToDrawingPointWithKind(point, shapes.filter(shape => shape.type !== 'wall'), gridMm, thresholdMm, excludeId);
  let candidate: ShapePoint | null = null;
  let closestDistance = thresholdMm;
  for (const shape of shapes) {
    if (shape.id === excludeId || shape.type !== 'wall') continue;
    const [start, end] = worldWallPoints(shape);
    if (!start || !end) continue;
    
    let target = closestPointOnSegment(point, start, end);
    let distance = Math.hypot(target.x - point.x, target.y - point.y);

    const distStart = Math.hypot(start.x - point.x, start.y - point.y);
    const distEnd = Math.hypot(end.x - point.x, end.y - point.y);
    if (distStart <= thresholdMm && distStart < distance + 1) {
      target = start;
      distance = distStart;
    } else if (distEnd <= thresholdMm && distEnd < distance + 1) {
      target = end;
      distance = distEnd;
    }
    
    const face = getBoundarySnapPoint(target, fixedEndpoint, start, end, shape.wallThicknessMm ?? 101.6);
    distance = Math.hypot(face.x - point.x, face.y - point.y);
    if (distance <= closestDistance) {
      candidate = face;
      closestDistance = distance;
    }
  }
  return candidate && (ordinary.kind === 'grid' || closestDistance <= Math.hypot(ordinary.point.x - point.x, ordinary.point.y - point.y))
    ? { point: candidate, kind: 'wall' }
    : ordinary;
}

export interface AlignmentGuide {
  orientation: 'vertical' | 'horizontal';
  position: number;
}

export interface ProximityGuide {
  direction: 'top' | 'bottom' | 'left' | 'right';
  start: ShapePoint;
  end: ShapePoint;
  distanceMm: number;
  targetId: string;
}

/** World-space footprints; each wall segment includes its physical half-thickness. */
function proximityFootprints(shape: Shape): ShapePoint[][] {
  const radians = (shape.rotation ?? 0) * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const pivot = nodePosition(shape);
  const transform = (point: ShapePoint): ShapePoint => ({
    x: pivot.x + point.x * cos - point.y * sin,
    y: pivot.y + point.x * sin + point.y * cos,
  });
  const points = getShapePoints(shape);
  if (shape.type === 'wall') {
    const footprints: ShapePoint[][] = [];
    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1];
      const end = points[i];
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      if (!length) continue;
      const half = (shape.wallThicknessMm ?? 101.6) / 2;
      const nx = -(end.y - start.y) / length * half;
      const ny = (end.x - start.x) / length * half;
      footprints.push([
        { x: start.x + nx, y: start.y + ny }, { x: end.x + nx, y: end.y + ny },
        { x: end.x - nx, y: end.y - ny }, { x: start.x - nx, y: start.y - ny },
      ].map(transform));
    }
    return footprints;
  }
  const x = isCenteredShape(shape) ? -shape.width / 2 : 0;
  const y = isCenteredShape(shape) ? -shape.height / 2 : 0;
  return [[{ x, y }, { x: x + shape.width, y },
    { x: x + shape.width, y: y + shape.height }, { x, y: y + shape.height }].map(transform)];
}

/** Axis-aligned world bounds, independent of viewport zoom and selection decoration. */
export function proximityBounds(shape: Shape): Bounds {
  const points = proximityFootprints(shape).flat();
  if (!points.length) return { x: shape.x, y: shape.y, width: 0, height: 0 };
  const x = Math.min(...points.map(point => point.x));
  const y = Math.min(...points.map(point => point.y));
  return { x, y, width: Math.max(...points.map(point => point.x)) - x,
    height: Math.max(...points.map(point => point.y)) - y };
}

/** Clip a convex footprint to a half-plane to restrict guides to adjacent edges. */
function clipProximityFootprint(points: ShapePoint[], axis: 'x' | 'y', limit: number, greater: boolean): ShapePoint[] {
  const result: ShapePoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const aInside = greater ? a[axis] >= limit : a[axis] <= limit;
    const bInside = greater ? b[axis] >= limit : b[axis] <= limit;
    if (aInside) result.push(a);
    if (aInside !== bInside) {
      const t = (limit - a[axis]) / (b[axis] - a[axis]);
      result.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return result;
}

/** Nearest unobstructed cardinal gaps in actual mm; pass only other shapes or excludeId. */
export function calculateProximityGuides(bounds: Bounds, shapes: Shape[], excludeId?: string): ProximityGuide[] {
  const nearest = new Map<ProximityGuide['direction'], ProximityGuide>();
  const directions = ['top', 'bottom', 'left', 'right'] as const;
  for (const shape of shapes) {
    if (shape.id === excludeId || shape.type === 'measurement') continue;
    for (const footprint of proximityFootprints(shape)) {
      for (const direction of directions) {
        const vertical = direction === 'top' || direction === 'bottom';
        const axis = vertical ? 'y' : 'x';
        const crossAxis = vertical ? 'x' : 'y';
        const low = bounds[crossAxis];
        const high = low + (vertical ? bounds.width : bounds.height);
        const clipped = clipProximityFootprint(clipProximityFootprint(footprint, crossAxis, low, true), crossAxis, high, false);
        if (!clipped.length) continue;
        const positive = direction === 'bottom' || direction === 'right';
        const edge = bounds[axis] + (positive ? (vertical ? bounds.height : bounds.width) : 0);
        const coordinate = positive ? Math.min(...clipped.map(p => p[axis])) : Math.max(...clipped.map(p => p[axis]));
        const distanceMm = positive ? coordinate - edge : edge - coordinate;
        // Overlapping footprints do not have a positive directional clearance.
        if (distanceMm < 0 || distanceMm >= (nearest.get(direction)?.distanceMm ?? Infinity)) continue;
        const face = clipped.filter(p => Math.abs(p[axis] - coordinate) < 1e-8);
        const cross = (Math.min(...face.map(p => p[crossAxis])) + Math.max(...face.map(p => p[crossAxis]))) / 2;
        nearest.set(direction, {
          direction, distanceMm, targetId: shape.id,
          start: vertical ? { x: cross, y: edge } : { x: edge, y: cross },
          end: vertical ? { x: cross, y: coordinate } : { x: coordinate, y: cross },
        });
      }
    }
  }
  return directions.flatMap(direction => nearest.has(direction) ? [nearest.get(direction)!] : []);
}

/**
 * Finds vertical and horizontal alignment lines between a dragged shape's
 * edges/center and other shapes in the drawing.
 */
export function findAlignmentGuides(origin: ShapePoint, draggedShape: Shape, shapes: Shape[], toleranceMm = 0.5): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];
  const draggedXTargets = [origin.x, origin.x + draggedShape.width / 2, origin.x + draggedShape.width];
  const draggedYTargets = [origin.y, origin.y + draggedShape.height / 2, origin.y + draggedShape.height];

  const matchedX = new Set<number>();
  const matchedY = new Set<number>();

  for (const shape of shapes) {
    if (shape.id === draggedShape.id || shape.type === 'measurement') continue;
    const targetXList = [shape.x, shape.x + shape.width / 2, shape.x + shape.width];
    const targetYList = [shape.y, shape.y + shape.height / 2, shape.y + shape.height];

    for (const dx of draggedXTargets) {
      for (const tx of targetXList) {
        if (Math.abs(dx - tx) <= toleranceMm) {
          const rounded = Math.round(tx * 1000) / 1000;
          if (!matchedX.has(rounded)) {
            matchedX.add(rounded);
            guides.push({ orientation: 'vertical', position: tx });
          }
        }
      }
    }

    for (const dy of draggedYTargets) {
      for (const ty of targetYList) {
        if (Math.abs(dy - ty) <= toleranceMm) {
          const rounded = Math.round(ty * 1000) / 1000;
          if (!matchedY.has(rounded)) {
            matchedY.add(rounded);
            guides.push({ orientation: 'horizontal', position: ty });
          }
        }
      }
    }
  }

  return guides;
}

/**
 * Aligns any unrotated bounding-box anchor of the dragged shape to a nearby
 * anchor or edge/center line on another shape, falling back to the physical grid.
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

  if (result) {
    return { point: result, kind: 'object' };
  }

  // Check 1D edge/center alignment along X and Y axes independently
  const localXAnchors = [0, draggedShape.width / 2, draggedShape.width];
  const localYAnchors = [0, draggedShape.height / 2, draggedShape.height];
  let bestX: { originX: number; distance: number } | null = null;
  let bestY: { originY: number; distance: number } | null = null;

  for (const shape of shapes) {
    if (shape.id === draggedShape.id || shape.type === 'measurement') continue;
    const targetXList = [shape.x, shape.x + shape.width / 2, shape.x + shape.width];
    const targetYList = [shape.y, shape.y + shape.height / 2, shape.y + shape.height];

    for (const localX of localXAnchors) {
      const candidateX = origin.x + localX;
      for (const tx of targetXList) {
        const dist = Math.abs(tx - candidateX);
        if (dist <= thresholdMm && (!bestX || dist < bestX.distance)) {
          bestX = { originX: tx - localX, distance: dist };
        }
      }
    }

    for (const localY of localYAnchors) {
      const candidateY = origin.y + localY;
      for (const ty of targetYList) {
        const dist = Math.abs(ty - candidateY);
        if (dist <= thresholdMm && (!bestY || dist < bestY.distance)) {
          bestY = { originY: ty - localY, distance: dist };
        }
      }
    }
  }

  if (bestX || bestY) {
    return {
      point: {
        x: bestX ? bestX.originX : snap(origin.x, gridMm),
        y: bestY ? bestY.originY : snap(origin.y, gridMm),
      },
      kind: 'object',
    };
  }

  return { point: { x: snap(origin.x, gridMm), y: snap(origin.y, gridMm) }, kind: 'grid' };
}

/** Embed openings on wall centerlines, independently of wall-to-wall face snapping. */
export function snapOpeningOrigin(origin: ShapePoint, draggedOpening: Shape, shapes: Shape[], gridMm: number, thresholdMm: number): SnapResult & { rotation?: number; height?: number } {
  const width = draggedOpening.width;
  const height = draggedOpening.height;
  const currentRotation = draggedOpening.rotation ?? 0;
  const currentRad = currentRotation * Math.PI / 180;
  const centerX = origin.x + (width / 2) * Math.cos(currentRad) - (height / 2) * Math.sin(currentRad);
  const centerY = origin.y + (width / 2) * Math.sin(currentRad) + (height / 2) * Math.cos(currentRad);

  let bestResult: (SnapResult & { rotation?: number; height?: number }) | null = null;
  let bestDistance = Infinity;

  for (const shape of shapes) {
    if (shape.id === draggedOpening.id || shape.type !== 'wall') continue;
    const wallRadians = (shape.rotation ?? 0) * Math.PI / 180;
    const wallPoints = getShapePoints(shape).map(point => ({
      x: shape.x + point.x * Math.cos(wallRadians) - point.y * Math.sin(wallRadians),
      y: shape.y + point.x * Math.sin(wallRadians) + point.y * Math.cos(wallRadians),
    }));
    for (let index = 1; index < wallPoints.length; index++) {
      const start = wallPoints[index - 1];
      const end = wallPoints[index];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length === 0) continue;

      const ux = dx / length;
      const uy = dy / length;
      const thickness = shape.wallThicknessMm ?? 101.6;

      // Check distance for both center and origin
      const projCenter = (centerX - start.x) * ux + (centerY - start.y) * uy;
      const clampedCenter = Math.max(0, Math.min(length, projCenter));
      const closestCenter = { x: start.x + ux * clampedCenter, y: start.y + uy * clampedCenter };
      const distCenter = Math.hypot(centerX - closestCenter.x, centerY - closestCenter.y);

      const projOrigin = (origin.x - start.x) * ux + (origin.y - start.y) * uy;
      const clampedOrigin = Math.max(0, Math.min(length, projOrigin));
      const closestOrigin = { x: start.x + ux * clampedOrigin, y: start.y + uy * clampedOrigin };
      const distOrigin = Math.hypot(origin.x - closestOrigin.x, origin.y - closestOrigin.y);

      const distance = Math.min(distCenter, distOrigin);
      const chosenProj = distCenter <= distOrigin ? projCenter : projOrigin + width / 2;

      const effectiveThreshold = Math.max(thresholdMm, thickness * 1.5);
      if (distance <= effectiveThreshold && distance < bestDistance) {
        bestDistance = distance;
        const centerAlong = length >= width
          ? Math.max(width / 2, Math.min(length - width / 2, chosenProj))
          : length / 2;

        const wallAngleDeg = ((Math.atan2(dy, dx) * 180 / Math.PI) % 360 + 360) % 360;
        const diff1 = Math.abs((((currentRotation - wallAngleDeg) % 360) + 540) % 360 - 180);
        const diff2 = Math.abs((((currentRotation - (wallAngleDeg + 180)) % 360) + 540) % 360 - 180);
        const targetRotation = diff2 < diff1 ? (wallAngleDeg + 180) % 360 : wallAngleDeg;
        const targetRadians = targetRotation * Math.PI / 180;
        // Convert the chosen centerline center back to the rotated rectangle origin.
        const snappedOrigin = {
          x: start.x + ux * centerAlong - Math.cos(targetRadians) * width / 2 + Math.sin(targetRadians) * thickness / 2,
          y: start.y + uy * centerAlong - Math.sin(targetRadians) * width / 2 - Math.cos(targetRadians) * thickness / 2,
        };

        bestResult = {
          point: snappedOrigin,
          rotation: targetRotation,
          height: thickness,
          kind: 'wall',
        };
      }
    }
  }

  return bestResult ?? snapShapeOrigin(origin, draggedOpening, shapes, gridMm, thresholdMm);
}

/** Move a whole wall so either endpoint joins another wall's visible face. */
export function snapWallOrigin(origin: ShapePoint, draggedWall: Shape, shapes: Shape[], gridMm: number, thresholdMm: number): SnapResult {
  const localEndpoints = worldWallPoints({ ...draggedWall, x: 0, y: 0 });
  let result: ShapePoint | null = null;
  let closestDistance = thresholdMm;
  for (const shape of shapes) {
    if (shape.id === draggedWall.id || shape.type !== 'wall') continue;
    const [start, end] = worldWallPoints(shape);
    if (!start || !end) continue;
    for (const endpoint of localEndpoints) {
      const movedEndpoint = { x: origin.x + endpoint.x, y: origin.y + endpoint.y };
      const otherEndpoint = localEndpoints.find(e => e !== endpoint) || { x: 0, y: 0 };
      const approachPoint = { x: origin.x + otherEndpoint.x, y: origin.y + otherEndpoint.y };

      let target = closestPointOnSegment(movedEndpoint, start, end);
      let distance = Math.hypot(target.x - movedEndpoint.x, target.y - movedEndpoint.y);

      const distStart = Math.hypot(start.x - movedEndpoint.x, start.y - movedEndpoint.y);
      const distEnd = Math.hypot(end.x - movedEndpoint.x, end.y - movedEndpoint.y);
      if (distStart <= thresholdMm && distStart < distance + 1) {
        target = start;
        distance = distStart;
      } else if (distEnd <= thresholdMm && distEnd < distance + 1) {
        target = end;
        distance = distEnd;
      }

      const boundaryPoint = getBoundarySnapPoint(target, approachPoint, start, end, shape.wallThicknessMm ?? 101.6);
      distance = Math.hypot(boundaryPoint.x - movedEndpoint.x, boundaryPoint.y - movedEndpoint.y);
      if (distance <= closestDistance) {
        result = { x: boundaryPoint.x - endpoint.x, y: boundaryPoint.y - endpoint.y };
        closestDistance = distance;
      }
    }
  }
  return result
    ? { point: result, kind: 'wall' }
    : snapShapeOrigin(origin, draggedWall, shapes.filter(shape => shape.type !== 'wall'), gridMm, thresholdMm);
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
export function mergeMatchingWalls(document: DrawingDocument, targetId: string): DrawingDocument {
  const target = document.shapes.find(s => s.id === targetId);
  if (!target || target.type !== 'wall') return document;

  let currentPoints = getShapePoints(target).map(p => ({ x: target.x + p.x, y: target.y + p.y }));
  let didMerge = false;
  let remainingShapes = document.shapes.filter(s => s.id !== targetId);

  let canMerge = true;
  while (canMerge) {
    canMerge = false;
    for (let i = 0; i < remainingShapes.length; i++) {
      const shape = remainingShapes[i];
      if (shape.type !== 'wall') continue;
      
      const shapePoints = getShapePoints(shape).map(p => ({ x: shape.x + p.x, y: shape.y + p.y }));
      const targetStart = currentPoints[0];
      const targetEnd = currentPoints[currentPoints.length - 1];
      const shapeStart = shapePoints[0];
      const shapeEnd = shapePoints[shapePoints.length - 1];
      
      const EPSILON = 0.001;
      const match = (p1: ShapePoint | undefined, p2: ShapePoint | undefined) => p1 && p2 && Math.hypot(p1.x - p2.x, p1.y - p2.y) < EPSILON;
      
      if (match(targetEnd, shapeStart)) {
        currentPoints = [...currentPoints, ...shapePoints.slice(1)];
        remainingShapes.splice(i, 1);
        canMerge = true;
        didMerge = true;
        break;
      } else if (match(targetEnd, shapeEnd)) {
        currentPoints = [...currentPoints, ...shapePoints.slice(0, -1).reverse()];
        remainingShapes.splice(i, 1);
        canMerge = true;
        didMerge = true;
        break;
      } else if (match(targetStart, shapeEnd)) {
        currentPoints = [...shapePoints.slice(0, -1), ...currentPoints];
        remainingShapes.splice(i, 1);
        canMerge = true;
        didMerge = true;
        break;
      } else if (match(targetStart, shapeStart)) {
        currentPoints = [...shapePoints.slice(1).reverse(), ...currentPoints];
        remainingShapes.splice(i, 1);
        canMerge = true;
        didMerge = true;
        break;
      }
    }
  }

  if (!didMerge) return document;

  const normalized = normalizePoints(currentPoints);
  const mergedWall: Shape = {
    ...target,
    ...normalized.bounds,
    points: normalized.points.flatMap(p => [p.x, p.y])
  };

  return {
    ...document,
    shapes: [...remainingShapes, mergedWall]
  };
}
