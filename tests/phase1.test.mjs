import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { registerHooks } from 'node:module';

// Node 24 strips TypeScript. Resolve Vite-style extensionless local imports for these tests.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && context.parentURL?.includes('/src/')) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  clear() { this.values.clear(); }
}
const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
const { createDocument } = await import('../src/domain/document.ts');
const { inchesToMm, mmToInches, paperMm, parseInches } = await import('../src/domain/units.ts');
const { distanceBetween, findAlignmentGuides, resizeWallToLength, snap, screenToWorld, snapOpeningOrigin, snapShapeOrigin, snapToDrawingPoint, snapToWallFace, snapToWallPoint, snapWallEndpoint, snapWallOrigin, visibleGridStep, nodePosition, normalizePoints, resizePoints, snappedBounds, wallLength } = await import('../src/domain/geometry.ts');
const { decodeDrawing, encodeDrawing } = await import('../src/services/drawingFiles.ts');
const { loadRecovery, saveRecovery } = await import('../src/services/recovery.ts');
const { useDrawingStore } = await import('../src/store/useDrawingStore.ts');
const { WALL_DEFINITIONS, WALL_TYPES } = await import('../src/domain/walls.ts');
const { FURNITURE_DEFINITIONS, FURNITURE_KINDS } = await import('../src/domain/furniture.ts');
const { DOOR_TYPES, WINDOW_TYPES, OPENING_DEFINITIONS } = await import('../src/domain/doors.ts');

const shape = { id: 'test-shape', type: 'rectangle', x: -25.4, y: 50.8, width: 3048, height: 304.8, fill: '#3b82f6' };
const drawing = () => ({ ...createDocument(), shapes: [{ ...shape }] });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

beforeEach(() => {
  storage.clear();
  useDrawingStore.setState({ document: createDocument(), past: [], future: [], recoveryEnabled: true, recoveryWarning: null });
});

test('inches and fractions convert exactly to actual and 1:25 dimensions', () => {
  close(parseInches('12 3/8'), 12.375);
  close(parseInches('3/8"'), 0.375);
  close(parseInches('-1 1/2 in'), -1.5);
  close(paperMm(inchesToMm(12)), 12.192);
  close(paperMm(inchesToMm(16)), 16.256);
  close(paperMm(inchesToMm(120)), 121.92);
  close(mmToInches(inchesToMm(12.375)), 12.375);
});
test('measurement parser rejects ambiguous, empty and executable input', () => {
  for (const input of ['', '1/0', '12 inches extra', '1+2', 'NaN', 'Infinity', '<script>', '1 2', '1e10']) {
    assert.throws(() => parseInches(input));
  }
});
test('world coordinates and grid snapping are independent of pan/zoom', () => {
  for (const scale of [0.015, 0.15, 3]) {
    const point = screenToWorld({ x: 100 + 3048 * scale, y: -20 + 254 * scale }, { x: 100, y: -20 }, scale);
    close(point.x, 3048); close(point.y, 254);
    close(snap(point.x, 25.4), 3048);
    assert.ok(visibleGridStep(3.175, scale) * scale >= 12);
  }
  close(snap(-30, 25.4), -25.4);
});
test('ellipse centers and snapped bounds preserve top-left world coordinates', () => {
  assert.deepEqual(nodePosition({ ...shape, type: 'circle', x: 0, y: 0, width: 100, height: 200 }), { x: 50, y: 100 });
  assert.deepEqual(snappedBounds({ x: 27, y: -27, width: 0.01, height: 78 }, 25), { x: 25, y: -25, width: 25, height: 75 });
});
test('drawing roundtrip preserves geometry, units, colors and literal text', () => {
  const original = drawing();
  original.shapes.push({ ...shape, id: 'text', type: 'text', text: '<img onerror=alert(1)>\nsecond line' });
  assert.deepEqual(decodeDrawing(encodeDrawing(original)), original);
});
test('imports reject duplicate IDs, oversized or malformed data and legacy pixel documents', () => {
  for (const candidate of [
    { shapes: [shape] }, { ...drawing(), version: 2 }, { ...drawing(), units: 'px' },
    { ...drawing(), gridMm: 0 }, { ...drawing(), shapes: [shape, shape] },
    { ...drawing(), shapes: [{ ...shape, width: -1 }] },
    { ...drawing(), shapes: [{ ...shape, x: Infinity }] },
    { ...drawing(), shapes: [{ ...shape, fill: 'url(https://example.com)' }] },
    { ...drawing(), shapes: [{ ...shape, type: 'script' }] },
    { ...drawing(), shapes: [{ ...shape, text: 'x'.repeat(10001) }] },
    { ...drawing(), shapes: Array(2001).fill(shape) },
  ]) assert.throws(() => decodeDrawing(JSON.stringify(candidate)));
  assert.throws(() => decodeDrawing('x'.repeat(2 * 1024 * 1024 + 1)));
  assert.throws(() => decodeDrawing('{ broken'));
});
test('imports rebuild allowlisted objects and ignore injected fields', () => {
  const value = JSON.parse(encodeDrawing(drawing()));
  value.apiKey = 'not-a-real-key';
  const payload = JSON.stringify(value).slice(0, -1) + ',"__proto__":{"compromised":true}}';
  const result = decodeDrawing(payload);
  assert.equal('apiKey' in result, false);
  assert.equal('compromised' in result, false);
});
test('local recovery restores latest data and falls back without overwriting corruption', () => {
  const first = drawing();
  saveRecovery(first);
  const second = { ...first, name: 'Second' };
  saveRecovery(second);
  assert.deepEqual(loadRecovery().document, second);
  storage.setItem('karma-draft.document.v1', '{invalid');
  const recovered = loadRecovery();
  assert.deepEqual(recovered.document, first);
  assert.equal(recovered.enabled, false);
  assert.ok(recovered.warning);
  assert.equal(storage.getItem('karma-draft.document.v1'), '{invalid');
});
test('unreadable recovery pauses automatic writes and preserves raw data', () => {
  storage.setItem('karma-draft.document.v1', 'damaged');
  const result = loadRecovery();
  assert.equal(result.enabled, false);
  assert.equal(storage.getItem('karma-draft.document.v1'), 'damaged');
});
test('state edits support undo/redo and invalid changes leave the drawing intact', () => {
  const state = useDrawingStore.getState();
  state.openDocument(drawing());
  state.updateBounds(shape.id, { x: 0, y: 0, width: inchesToMm(12.375), height: 254 });
  close(useDrawingStore.getState().document.shapes[0].width, 314.325);
  state.undo();
  assert.deepEqual(useDrawingStore.getState().document, drawing());
  state.redo();
  close(useDrawingStore.getState().document.shapes[0].width, 314.325);
  const previous = useDrawingStore.getState().document;
  assert.throws(() => state.updateBounds(shape.id, { x: 0, y: 0, width: -1, height: 254 }));
  assert.equal(useDrawingStore.getState().document, previous);
});
test('store accepts empty text and undo restores edited or deleted text shapes', () => {
  const state = useDrawingStore.getState();
  state.addShape({ ...shape, type: 'text', text: 'Original' });
  const id = useDrawingStore.getState().document.shapes[0].id;
  state.updateText(id, '');
  assert.equal(useDrawingStore.getState().document.shapes[0].text, '');
  state.undo();
  assert.equal(useDrawingStore.getState().document.shapes[0].text, 'Original');
  state.deleteShape(id);
  assert.equal(useDrawingStore.getState().document.shapes.length, 0);
  state.undo();
  assert.equal(useDrawingStore.getState().document.shapes[0].id, id);
});

test('missing latest recovery falls back to a valid previous copy', () => {
  storage.setItem('karma-draft.document.v1.previous', encodeDrawing(drawing()));
  const result = loadRecovery();
  assert.deepEqual(result.document, drawing());
  assert.equal(result.enabled, false);
});
test('quota errors surface without destroying the latest recovery', () => {
  saveRecovery(drawing());
  const previous = storage.getItem('karma-draft.document.v1');
  const originalSet = storage.setItem;
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  try {
    assert.throws(() => saveRecovery({ ...drawing(), name: 'Cannot save' }));
    assert.equal(storage.getItem('karma-draft.document.v1'), previous);
  } finally { storage.setItem = originalSet; }
});
test('history is bounded and editing after undo clears the redo branch', () => {
  const state = useDrawingStore.getState();
  for (let index = 0; index < 60; index++) state.updateSettings({ name: `Drawing ${index}` });
  assert.equal(useDrawingStore.getState().past.length, 50);
  state.undo();
  assert.equal(useDrawingStore.getState().future.length, 1);
  state.updateSettings({ name: 'New branch' });
  assert.equal(useDrawingStore.getState().future.length, 0);
});

test('Phase 2 shapes validate and survive a drawing roundtrip', () => {
  const types = ['square', 'ellipse', 'triangle', 'arc'];
  const document = drawing();
  types.forEach((type) => document.shapes.push({ ...shape, id: `phase2-${type}`, type, rotation: 45, ...(type === 'arc' ? { startAngle: 30, endAngle: 270 } : {}) }));
  document.shapes.push({ ...shape, id: 'line', type: 'line', points: [{ x: 0, y: 0 }, { x: 3048, y: 304.8 }] });
  document.shapes.push({ ...shape, id: 'polyline', type: 'polyline', points: [{ x: 0, y: 0 }, { x: 100, y: 200 }, { x: 300, y: 50 }] });
  document.shapes.push({ ...shape, id: 'polygon', type: 'polygon', points: [{ x: 0, y: 0 }, { x: 100, y: 200 }, { x: 300, y: 50 }] });
  assert.deepEqual(decodeDrawing(encodeDrawing(document)), document);
});

test('Phase 2 rejects missing or oversized point lists and invalid angles', () => {
  for (const candidate of [
    { ...shape, type: 'line' },
    { ...shape, type: 'polyline', points: [{ x: 0, y: 0 }] },
    { ...shape, type: 'polygon', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
    { ...shape, type: 'line', points: Array(201).fill({ x: 0, y: 0 }) },
    { ...shape, type: 'arc', startAngle: Infinity },
    { ...shape, type: 'square', rotation: NaN },
  ]) assert.throws(() => decodeDrawing(JSON.stringify({ ...drawing(), shapes: [candidate] })));
});

test('Phase 2 point normalization and path resizing preserve precise local geometry', () => {
  const normalized = normalizePoints([{ x: -50, y: 100 }, { x: 150, y: 200 }, { x: 0, y: -25 }]);
  assert.deepEqual(normalized.bounds, { x: -50, y: -25, width: 200, height: 225 });
  assert.deepEqual(normalized.points, [{ x: 0, y: 125 }, { x: 200, y: 225 }, { x: 50, y: 0 }]);
  assert.deepEqual(resizePoints(normalized.points, normalized.bounds, { ...normalized.bounds, width: 400, height: 112.5 }), [{ x: 0, y: 62.5 }, { x: 400, y: 112.5 }, { x: 100, y: 0 }]);
});

test('streamlined rectangle and circle tools allow independent exact dimensions', () => {
  const state = useDrawingStore.getState();
  state.addShape({ ...shape, type: 'rectangle', width: 100, height: 100 });
  const rectangle = useDrawingStore.getState().document.shapes[0];
  state.updateGeometry(rectangle.id, { x: 0, y: 0, width: 300, height: 125 }, { rotation: 30 });
  const result = useDrawingStore.getState().document.shapes[0];
  assert.equal(result.width, 300);
  assert.equal(result.height, 125);
  assert.equal(result.rotation, 30);
  state.undo();
  assert.equal(useDrawingStore.getState().document.shapes[0].rotation, undefined);
  state.addShape({ ...shape, id: 'circle', type: 'circle', width: 100, height: 100 });
  const circle = useDrawingStore.getState().document.shapes.at(-1);
  state.updateGeometry(circle.id, { x: 0, y: 0, width: 300, height: 125 });
  assert.equal(useDrawingStore.getState().document.shapes.at(-1).height, 125);
});

test('Phase 2 snaps to nearby shape corners or vertices before falling back to the physical grid', () => {
  const anchor = { ...shape, id: 'anchor', x: 100, y: 100, width: 300, height: 200 };
  assert.deepEqual(snapToDrawingPoint({ x: 405, y: 95 }, [anchor], 25.4, 12), { x: 400, y: 100 });
  const gridResult = snapToDrawingPoint({ x: 147, y: 153 }, [anchor], 25.4, 12);
  close(gridResult.x, 152.4); close(gridResult.y, 152.4);
  const path = { ...shape, id: 'path', type: 'polyline', x: 500, y: 0, width: 200, height: 200, points: [{ x: 0, y: 0 }, { x: 125, y: 75 }] };
  assert.deepEqual(snapToDrawingPoint({ x: 620, y: 70 }, [path], 25.4, 12), { x: 625, y: 75 });
  assert.deepEqual(snapToDrawingPoint({ x: 100, y: 100 }, [anchor], 25.4, 12, 'anchor'), { x: 101.6, y: 101.6 });
});

test('Phase 2 dragging aligns any shape corner or center to nearby object anchors', () => {
  const dragged = { ...shape, id: 'dragged', x: 0, y: 0, width: 100, height: 100 };
  const target = { ...shape, id: 'target', x: 500, y: 300, width: 100, height: 100 };
  const cornerResult = snapShapeOrigin({ x: 396, y: 204 }, dragged, [dragged, target], 25, 12);
  assert.deepEqual(cornerResult, { point: { x: 400, y: 200 }, kind: 'object' });
  const centerResult = snapShapeOrigin({ x: 446, y: 254 }, dragged, [dragged, target], 25, 12);
  assert.deepEqual(centerResult, { point: { x: 450, y: 250 }, kind: 'object' });
  assert.deepEqual(snapShapeOrigin({ x: 142, y: 153 }, dragged, [target], 25, 12), { point: { x: 150, y: 150 }, kind: 'grid' });
});

test('Phase 3 walls require approved assembly data, physical thickness, and two endpoints', () => {
  const wall = {
    ...shape,
    id: 'wall',
    type: 'wall',
    wallType: 'interior_partition',
    wallThicknessMm: 101.6,
    points: [{ x: 0, y: 0 }, { x: 3048, y: 0 }],
  };
  assert.deepEqual(decodeDrawing(encodeDrawing({ ...drawing(), shapes: [wall] })).shapes[0], wall);
  for (const invalid of [
    { ...wall, wallType: 'unknown_wall' },
    { ...wall, wallThicknessMm: 0 },
    { ...wall, points: [{ x: 0, y: 0 }] },
  ]) assert.throws(() => decodeDrawing(JSON.stringify({ ...drawing(), shapes: [invalid] })));
});

test('Phase 3 wall categories have explicit, non-persistent visual shorthand', () => {
  assert.deepEqual(WALL_TYPES.map((type) => WALL_DEFINITIONS[type].pattern), [
    'masonry-joints', 'concrete-stipple', 'double-line', 'double-line', 'dash-line', 'solid',
  ]);
  assert.ok(WALL_TYPES.every((type) => WALL_DEFINITIONS[type].color.startsWith('#')));
});

test('Phase 3 wall joins snap endpoints to a wall centerline without using an infinite extension', () => {
  const target = {
    ...shape,
    id: 'target-wall',
    type: 'wall',
    x: 100,
    y: 100,
    width: 400,
    height: 1,
    points: [{ x: 0, y: 0 }, { x: 400, y: 0 }],
    wallType: 'interior_partition',
    wallThicknessMm: 101.6,
  };
  assert.deepEqual(snapToWallPoint({ x: 280, y: 108 }, [target], 25, 12), { point: { x: 280, y: 100 }, kind: 'wall' });
  assert.deepEqual(snapToWallPoint({ x: 550, y: 108 }, [target], 25, 12), { point: { x: 550, y: 100 }, kind: 'grid' });
});

test('Phase 3 wall endpoints stop at the nearest visible face of a thick wall', () => {
  const target = {
    ...shape,
    id: 'thick-wall',
    type: 'wall',
    x: 100,
    y: 100,
    width: 400,
    height: 1,
    points: [{ x: 0, y: 0 }, { x: 400, y: 0 }],
    wallType: 'interior_partition',
    wallThicknessMm: 100,
  };
  assert.deepEqual(snapWallEndpoint({ x: 280, y: 55 }, { x: 280, y: 0 }, [target], 25, 12), { point: { x: 280, y: 50 }, kind: 'wall' });
  const moving = { ...target, id: 'moving-wall', x: 280, y: -45, points: [{ x: 0, y: 0 }, { x: 0, y: 100 }] };
  assert.deepEqual(snapWallOrigin({ x: 280, y: -45 }, moving, [target], 25, 12), { point: { x: 280, y: -50 }, kind: 'wall' });
});

test('Phase 3 exact wall length preserves the first endpoint, including after rotation', () => {
  const wall = {
    ...shape,
    id: 'length-wall',
    type: 'wall',
    x: 100,
    y: 100,
    width: 100,
    height: 1,
    rotation: 90,
    points: [{ x: 100, y: 0 }, { x: 0, y: 0 }],
    wallType: 'interior_partition',
    wallThicknessMm: 101.6,
  };
  const resized = resizeWallToLength(wall, 200);
  close(wallLength({ ...wall, ...resized }), 200);
  close(resized.bounds.x + resized.points[0].x * Math.cos(Math.PI / 2) - resized.points[0].y * Math.sin(Math.PI / 2), 100);
  close(resized.bounds.y + resized.points[0].x * Math.sin(Math.PI / 2) + resized.points[0].y * Math.cos(Math.PI / 2), 200);
  const reoriented = resizeWallToLength(wall, 200, 0);
  close(reoriented.bounds.x + reoriented.points[0].x, 100);
  close(reoriented.bounds.y + reoriented.points[0].y, 200);
  assert.throws(() => resizeWallToLength(wall, 0));
});

test('tape-measure endpoints use actual millimeters and snap to visible wall faces', () => {
  const wall = {
    ...shape,
    id: 'measure-wall',
    type: 'wall',
    x: 100,
    y: 100,
    width: 400,
    height: 1,
    points: [{ x: 0, y: 0 }, { x: 400, y: 0 }],
    wallType: 'interior_partition',
    wallThicknessMm: 100,
  };
  assert.deepEqual(snapToWallFace({ x: 250, y: 46 }, [wall], 25, 12), { point: { x: 250, y: 50 }, kind: 'wall' });
  close(distanceBetween({ x: 0, y: 0 }, { x: inchesToMm(12), y: 0 }), 304.8);
});

test('saved tape measurements validate and survive export/import like other drawing shapes', () => {
  const measurement = { ...shape, id: 'measurement', type: 'measurement', fill: '#dc2626', points: [{ x: 0, y: 0 }, { x: 304.8, y: 0 }] };
  const document = { ...drawing(), shapes: [measurement] };
  assert.deepEqual(decodeDrawing(encodeDrawing(document)), document);
  assert.throws(() => decodeDrawing(JSON.stringify({ ...document, shapes: [{ ...measurement, points: [{ x: 0, y: 0 }] }] })));
});

test('furniture uses approved kinds and keeps real-world editable dimensions through export', () => {
  assert.equal(FURNITURE_KINDS.length, 25);
  for (const kind of FURNITURE_KINDS) {
    const def = FURNITURE_DEFINITIONS[kind];
    const furniture = { ...shape, id: `test-${kind}`, type: 'furniture', furnitureKind: kind, width: def.defaultWidthMm, height: def.defaultHeightMm, fill: def.color };
    assert.deepEqual(decodeDrawing(encodeDrawing({ ...drawing(), shapes: [furniture] })).shapes[0], furniture);
  }
  assert.throws(() => decodeDrawing(JSON.stringify({ ...drawing(), shapes: [{ ...shape, type: 'furniture', furnitureKind: 'unknown' }] })));
});

test('doors and windows validate and survive drawing export/import with swing and opening properties', () => {
  assert.equal(DOOR_TYPES.length, 4);
  assert.equal(WINDOW_TYPES.length, 3);
  for (const doorType of DOOR_TYPES) {
    const def = OPENING_DEFINITIONS[doorType];
    const door = {
      ...shape, id: `test-${doorType}`, type: 'door', doorType,
      width: def.defaultWidthMm, height: def.defaultThicknessMm, fill: def.color,
      swingHinge: 'right', swingDirection: 'outside',
    };
    assert.deepEqual(decodeDrawing(encodeDrawing({ ...drawing(), shapes: [door] })).shapes[0], door);
  }
  for (const windowType of WINDOW_TYPES) {
    const def = OPENING_DEFINITIONS[windowType];
    const windowOpening = {
      ...shape, id: `test-${windowType}`, type: 'window', windowType,
      width: def.defaultWidthMm, height: def.defaultThicknessMm, fill: def.color,
    };
    assert.deepEqual(decodeDrawing(encodeDrawing({ ...drawing(), shapes: [windowOpening] })).shapes[0], windowOpening);
  }
  assert.throws(() => decodeDrawing(JSON.stringify({ ...drawing(), shapes: [{ ...shape, type: 'door', doorType: 'invalid_door' }] })));
  assert.throws(() => decodeDrawing(JSON.stringify({ ...drawing(), shapes: [{ ...shape, type: 'window', windowType: 'invalid_window' }] })));
});

test('alignment guides detect edge and center alignments between dragged shape and targets', () => {
  const target = { ...shape, id: 'target', x: 200, y: 100, width: 200, height: 100 };
  const dragged = { ...shape, id: 'dragged', x: 0, y: 0, width: 100, height: 100 };

  // Aligned on left edge (x = 200) and top edge (y = 100)
  const guides = findAlignmentGuides({ x: 200, y: 100 }, dragged, [target]);
  assert.ok(guides.some((g) => g.orientation === 'vertical' && g.position === 200));
  assert.ok(guides.some((g) => g.orientation === 'horizontal' && g.position === 100));

  // Aligned on center X (dragged center = 250 + 50 = 300, target center = 200 + 100 = 300)
  const centerGuides = findAlignmentGuides({ x: 250, y: 400 }, dragged, [target]);
  assert.ok(centerGuides.some((g) => g.orientation === 'vertical' && g.position === 300));
  assert.equal(centerGuides.some((g) => g.orientation === 'horizontal'), false);

  // 1D alignment snapping snaps X when near target edge while Y falls back to grid
  const snapResult = snapShapeOrigin({ x: 196, y: 403 }, dragged, [target], 25, 12);
  assert.deepEqual(snapResult, { point: { x: 200, y: 400 }, kind: 'object' });
});

test('snapOpeningOrigin snaps doors and windows to walls with matching angle, thickness, and centerline offset', () => {
  const wall = {
    ...shape,
    id: 'test-wall-1',
    type: 'wall',
    x: 1000,
    y: 2000,
    width: 4000,
    height: 1,
    points: [{ x: 0, y: 0 }, { x: 4000, y: 0 }],
    wallType: 'interior_partition',
    wallThicknessMm: 150,
  };

  const door = {
    ...shape,
    id: 'test-door-1',
    type: 'door',
    doorType: 'single_door',
    x: 0,
    y: 0,
    width: 900,
    height: 100,
    rotation: 0,
  };

  // Door dragged near wall center (x: 2500, y: 2010)
  const result = snapOpeningOrigin({ x: 2050, y: 1960 }, door, [wall], 25, 20);
  assert.equal(result.kind, 'wall');
  assert.equal(result.rotation, 0);
  assert.equal(result.height, 150);
  // Y origin should be wall centerline (2000) - thickness/2 (75) = 1925
  close(result.point.y, 1925);
  // X origin should place door along wall
  close(result.point.x, 2050);

  // Door dragged onto a vertical wall from (5000, 1000) to (5000, 5000)
  const verticalWall = {
    ...shape,
    id: 'test-wall-v',
    type: 'wall',
    x: 5000,
    y: 1000,
    width: 1,
    height: 4000,
    points: [{ x: 0, y: 0 }, { x: 0, y: 4000 }],
    wallType: 'exterior_brick',
    wallThicknessMm: 200,
  };

  const vResult = snapOpeningOrigin({ x: 4950, y: 2500 }, door, [verticalWall], 25, 20);
  assert.equal(vResult.kind, 'wall');
  assert.equal(vResult.rotation, 90);
  assert.equal(vResult.height, 200);
  // Centerline at x=5000, normal is (-1, 0), so x origin is 5000 - (-1)*100 = 5100
  close(vResult.point.x, 5100);

  // When far from any wall, falls back to grid/shape snap
  const farResult = snapOpeningOrigin({ x: 113, y: 113 }, door, [wall], 25, 5);
  assert.equal(farResult.kind, 'grid');
});

