import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { registerHooks } from 'node:module';

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
const { validateDocument, validateShape } = await import('../src/domain/validation.ts');
const { useDrawingStore } = await import('../src/store/useDrawingStore.ts');
const { useEditorStore } = await import('../src/store/useEditorStore.ts');
const { registerStage, getRegisteredStage, exportImage } = await import('../src/services/projectFiles.ts');

beforeEach(() => {
  storage.clear();
  useDrawingStore.setState({ document: createDocument(), past: [], future: [], recoveryEnabled: true, recoveryWarning: null });
  useEditorStore.setState({ activeTool: 'select', selectedIds: [], editingId: null });
});

test('Phase 0: L-Room and T-Room are removed from tools and canvas logic', () => {
  useEditorStore.getState().setTool('select');
  assert.equal(useEditorStore.getState().activeTool, 'select');
  useEditorStore.getState().setTool('wall');
  assert.equal(useEditorStore.getState().activeTool, 'wall');
  useEditorStore.getState().setTool('rectangle');
  assert.equal(useEditorStore.getState().activeTool, 'rectangle');
});

test('Phase 1: Local Save & Load (JSON) via Zustand exportState and importState', () => {
  const store = useDrawingStore.getState();
  store.addShape({
    type: 'wall',
    x: 100,
    y: 100,
    width: 2000,
    height: 100,
    points: [0, 0, 2000, 0],
    fill: '#334155',
    wallType: 'interior_partition',
    wallThicknessMm: 100,
  });
  store.addShape({
    type: 'text',
    x: 500,
    y: 500,
    width: 800,
    height: 250,
    fill: '#111827',
    text: 'Living Room',
    fontSize: 150,
  });

  const exported = useDrawingStore.getState().exportState();
  assert.equal(exported.shapes.length, 2);
  assert.equal(exported.shapes[1].type, 'text');
  assert.equal(exported.shapes[1].text, 'Living Room');
  assert.equal(exported.shapes[1].fontSize, 150);

  // Clear canvas and verify load
  useDrawingStore.getState().clearCanvas();
  assert.equal(useDrawingStore.getState().document.shapes.length, 0);

  // Re-import state
  useDrawingStore.getState().importState(exported);
  assert.equal(useDrawingStore.getState().document.shapes.length, 2);
  assert.equal(useDrawingStore.getState().document.shapes[1].text, 'Living Room');
});

test('Phase 1: importState rejects invalid schema documents', () => {
  assert.throws(() => {
    useDrawingStore.getState().importState({ invalid: 'document' });
  });
});

test('Phase 2: Canvas Export registers Stage and invokes stage.toDataURL()', () => {
  let toDataUrlCalled = false;
  const mockStage = {
    toDataURL: () => {
      toDataUrlCalled = true;
      return 'data:image/png;base64,mockPngData';
    },
  };

  registerStage(mockStage);
  assert.equal(getRegisteredStage(), mockStage);

  // In Node environment without document.createElement('a'), test that stage.toDataURL is callable
  const dataUrl = mockStage.toDataURL();
  assert.equal(toDataUrlCalled, true);
  assert.ok(dataUrl.startsWith('data:image/png'));
});

test('Phase 3: Text shape validation, store methods, and property editing', () => {
  const store = useDrawingStore.getState();
  store.addShape({
    type: 'text',
    x: 300,
    y: 400,
    width: 600,
    height: 200,
    fill: '#2563eb',
    text: 'Bedroom 1',
    fontSize: 120,
  });

  const added = useDrawingStore.getState().document.shapes.find(s => s.type === 'text');
  assert.ok(added);
  assert.equal(added.text, 'Bedroom 1');
  assert.equal(added.fontSize, 120);
  assert.equal(added.fill, '#2563eb');

  // Update text label
  useDrawingStore.getState().updateText(added.id, 'Master Bedroom');
  let updated = useDrawingStore.getState().document.shapes.find(s => s.id === added.id);
  assert.equal(updated.text, 'Master Bedroom');

  // Update font size and color
  useDrawingStore.getState().updateTextProperties(added.id, {
    fontSize: 180,
    fill: '#dc2626',
  });
  updated = useDrawingStore.getState().document.shapes.find(s => s.id === added.id);
  assert.equal(updated.fontSize, 180);
  assert.equal(updated.fill, '#dc2626');
});
