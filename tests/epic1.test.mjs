import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && context.parentURL?.includes('/src/')) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null }, configurable: true });
const { useDrawingStore: store } = await import('../src/store/useDrawingStore.ts');
const { useEditorStore: editor } = await import('../src/store/useEditorStore.ts');
const { createDocument, MAX_DISTANCE_MM } = await import('../src/domain/document.ts');
const { alignShapes, distributeShapes, transformShape, circleWithRadius } = await import('../src/domain/manipulation.ts');
const { proximityBounds, snapWallEndpoint } = await import('../src/domain/geometry.ts');
const { runSelectionCommand } = await import('../src/services/selectionCommands.ts');
const rect = (id, x = 0, y = 0, width = 100, height = 50) => ({ id, type: 'rectangle', x, y, width, height, fill: '#123456' });
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-7, `${a} != ${b}`);
beforeEach(() => {
  store.setState({ document: createDocument(), past: [], future: [], clipboard: [], pasteCount: 0 });
  editor.setState({ selectedIds: [], activeTool: 'select', error: null });
});

test('Clipboard copies mixed selections with fresh IDs, independent points, and atomic undo', () => {
  const wall = { ...rect('wall'), type: 'wall', points: [0,0,100,0], wallType: 'interior_partition', wallThicknessMm: 100 };
  store.getState().importState({ ...createDocument(), shapes: [rect('a'), wall] });
  editor.getState().selectMany(['a','wall']);
  runSelectionCommand('copy');
  runSelectionCommand('paste');
  const state = store.getState();
  assert.equal(state.document.shapes.length, 4);
  assert.equal(state.past.length, 1);
  assert.equal(new Set(state.document.shapes.map(s=>s.id)).size, 4);
  assert.notEqual(state.document.shapes[3].points, wall.points);
  close(state.document.shapes[2].x, state.document.gridMm);
  assert.equal(editor.getState().selectedIds.length, 2);
  state.undo(); assert.equal(store.getState().document.shapes.length, 2);
  state.redo(); assert.equal(store.getState().document.shapes.length, 4);
  runSelectionCommand('cut'); assert.equal(store.getState().document.shapes.length, 2);
  state.undo(); assert.equal(store.getState().document.shapes.length, 4);
  state.pasteShapes(); close(store.getState().document.shapes.at(-1).x, state.document.gridMm * 2);
});

test('Duplicate preserves source selection data and clipboard; invalid batch rolls back', () => {
  store.getState().importState({ ...createDocument(), shapes: [rect('a'), rect('b',200)] });
  store.getState().copyShapes(['b']);
  const ids = store.getState().duplicateShapes(['a']);
  assert.equal(ids.length,1); assert.equal(store.getState().clipboard[0].id,'b');
  const before = store.getState().document;
  assert.throws(()=>store.getState().replaceShapes([rect('a',500),rect('b',MAX_DISTANCE_MM+1)]));
  assert.equal(store.getState().document,before);
});

test('All alignment actions respect rotated world bounds and preserve dimensions', () => {
  const shapes = [rect('a',100,300), {...rect('b',400,100,50,120), rotation:90}];
  for (const edge of ['top','bottom','left','right']) {
    const aligned = alignShapes(shapes,edge);
    const bounds = aligned.map(proximityBounds);
    const value = b=>edge==='top'?b.y:edge==='bottom'?b.y+b.height:edge==='left'?b.x:b.x+b.width;
    close(value(bounds[0]),value(bounds[1]));
    assert.equal(aligned[1].rotation,90); assert.equal(aligned[1].height,120);
  }
});

test('Distribution equalizes bounding-box gaps and explicit spacing fixes first item', () => {
  for (const axis of ['horizontal','vertical']) {
    const horizontal = axis==='horizontal';
    const shapes = [rect('a',0,0,100,100),rect('b',140,140,50,50),rect('c',400,400,200,200)];
    const key = horizontal?'x':'y'; const size=horizontal?'width':'height';
    const auto = distributeShapes(shapes,axis);
    close(auto[1][key]-auto[0][key]-auto[0][size], auto[2][key]-auto[1][key]-auto[1][size]);
    close(auto[2][key],400);
    const manual = distributeShapes(shapes,axis,30);
    close(manual[0][key],0); close(manual[1][key],130); close(manual[2][key],210);
  }
  assert.throws(()=>distributeShapes([rect('a'),rect('b'),rect('c')],'horizontal',NaN));
});

test('Batch translation and alignment each make one undo entry without resizing', () => {
  store.getState().importState({...createDocument(),shapes:[rect('a'),rect('b',200,300)]});
  editor.getState().selectMany(['a','b']); editor.getState().setTool('move');
  assert.deepEqual(editor.getState().selectedIds,['a','b']);
  store.getState().translateShapes(['a','b'],50,70);
  assert.equal(store.getState().past.length,1);
  assert.deepEqual(store.getState().document.shapes.map(s=>[s.x,s.y,s.width]),[[50,70,100],[250,370,100]]);
  store.getState().alignSelection(['a','b'],'top'); assert.equal(store.getState().past.length,2);
  store.getState().undo(); assert.equal(store.getState().document.shapes[1].y,370);
});

test('Path transforms bake rotation and scale while retaining wall flush snapping', () => {
  const wall={...rect('wall'),type:'wall',points:[0,0,100,0],wallType:'interior_partition',wallThicknessMm:20};
  const transformed=transformShape(wall,{position:{x:200,y:100},scaleX:2,scaleY:1,rotation:90});
  assert.equal(transformed.rotation,0); close(transformed.points[3],200);
  const snap=snapWallEndpoint({x:188,y:200},{x:0,y:200},[transformed],25,10);
  assert.equal(snap.kind,'wall'); close(snap.point.x,190);
  store.getState().importState({...createDocument(),shapes:[transformed]});
  assert.deepEqual(store.getState().exportState().shapes[0],transformed);
});

test('Circle radius preserves center and centered transforms preserve position', () => {
  const circle={...rect('circle',100,200,80,60),type:'circle'};
  const resized=circleWithRadius(circle,50);
  assert.equal(resized.width,100); assert.equal(resized.height,100);
  close(resized.x+50,140); close(resized.y+50,230);
  const transformed=transformShape(circle,{position:{x:140,y:230},scaleX:2,scaleY:3,rotation:45});
  close(transformed.x+transformed.width/2,140); close(transformed.y+transformed.height/2,230);
  assert.throws(()=>circleWithRadius(circle,-1));
});
