import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

// A disposable E-drive profile and a private pipe: no debugger network port or user profile.
const profile = resolve('node_modules/.cache/selection-browser');
mkdirSync(profile, { recursive: true });
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-sync', '--window-size=1280,900',
  `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'], windowsHide: true });
let nextId = 0;
let buffer = '';
const pending = new Map();
browser.stdio[4].on('data', (chunk) => {
  buffer += chunk.toString();
  let end;
  while ((end = buffer.indexOf('\0')) !== -1) {
    const message = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    const task = pending.get(message.id);
    if (task) {
      pending.delete(message.id);
      if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result);
    }
  }
});
function command(method, params = {}, sessionId) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    browser.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}
const timeout = setTimeout(() => { console.error('Browser test timed out'); browser.kill(); process.exitCode = 1; }, 45000);
try {
  const { targetId } = await command('Target.createTarget', { url: 'http://127.0.0.1:4174/' });
  const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
  const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', { expression: `(async () => (${expression}))()`, awaitPromise: true, returnByValue: true }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evaluate('!!document.querySelector("canvas")')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await evaluate(`(await import('/src/store/useDrawingStore.ts')).useDrawingStore.getState().openDocument((await import('/src/domain/document.ts')).createDocument())`);
  await evaluate(`(await import('/src/store/useEditorStore.ts')).useEditorStore.getState().resetView()`);
  const shapes = () => evaluate(`(await import('/src/store/useDrawingStore.ts')).useDrawingStore.getState().document.shapes`);
  const editor = () => evaluate(`(await import('/src/store/useEditorStore.ts')).useEditorStore.getState()`);
  const button = async (label) => {
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === ${JSON.stringify(label)} || b.innerText?.trim() === ${JSON.stringify(label)} || b.textContent?.includes(${JSON.stringify(label)}) || b.getAttribute('title') === ${JSON.stringify(label)} || b.getAttribute('aria-label') === ${JSON.stringify(label)});
      if (btn) {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  };
  await button('Tools');
  await button('Rectangle');
  const bounds = await evaluate(`JSON.stringify(document.querySelector('.drawing-canvas').getBoundingClientRect().toJSON())`);
  const { x, y } = JSON.parse(bounds);
  async function click(px, py) {
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: px, y: py, button: 'left', clickCount: 1 }, sessionId);
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: px, y: py, button: 'left', clickCount: 1 }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  async function drag(px, py, dx, dy) {
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px, y: py }, sessionId);
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: px, y: py, button: 'left', clickCount: 1 }, sessionId);
    for (let step = 1; step <= 5; step++) {
      await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px + dx * step / 5, y: py + dy * step / 5, buttons: 1 }, sessionId);
    }
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: px + dx, y: py + dy, button: 'left', clickCount: 1 }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  async function key(key, code) {
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode: code }, sessionId);
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: code }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const attachment = () => evaluate(`window.Konva.stages[0].findOne('Transformer').nodes().length`);
  async function waitForAttachment(expected) {
    for (let attempt = 0; attempt < 20; attempt++) {
      if (await attachment() === expected) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    console.log('ATTACHMENT DEBUG', await editor(), await evaluate(`window.Konva.stages[0].find('Rect').map(n => ({ x:n.x(), y:n.y(), width:n.width() }))`));
    assert.equal(await attachment(), expected);
  }
  await click(x + 200, y + 200);
  assert.equal((await shapes()).length, 1);
  process.stderr.write(`EDITOR_AFTER_PLACEMENT ${JSON.stringify(await editor())}\n`);
  process.stderr.write(`TRANSFORMER_AFTER_PLACEMENT ${await attachment()}\n`);
  await waitForAttachment(1);
  await click(x + 400, y + 400);
  assert.equal((await editor()).selectedId, null);
  await waitForAttachment(0);
  await click(x + 230, y + 230);
  await waitForAttachment(1);
  assert.equal(await evaluate(`window.Konva.stages[0].findOne('Transformer').find('._anchor').filter(n => n.isVisible()).length`), 9);
  const anchor = await evaluate(`window.Konva.stages[0].findOne('Transformer').findOne('.bottom-right').getAbsolutePosition()`);
  const width = (await shapes())[0].width;
  await drag(x + anchor.x, y + anchor.y, 35, 35);
  assert.ok((await shapes())[0].width > width, 'resize handle changes width');
  console.log('PASS rectangle placement, deselection, reselection, visible handles and resizing');

  await button('Text');
  await click(x + 450, y + 250);
  assert.equal((await shapes()).length, 2);
  await click(x + 230, y + 230);
  const position = (await editor()).position;
  await drag(x + 475, y + 265, 6, 0);
  const textShape = (await shapes()).find(s => s.type === 'text');
  assert.equal((await editor()).selectedId, textShape.id, 'a slight drag selects the text rather than retaining the rectangle');
  assert.deepEqual((await editor()).position, position, 'shape drag must not pan stage');
  assert.equal(await attachment(), 1);
  const image = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(resolve('node_modules/.cache/selection-browser.png'), Buffer.from(image.data, 'base64'));
  await button('Edit Text');
  assert.equal(await evaluate('!!document.querySelector("dialog[open]")'), true);
  await evaluate(`(document.querySelector('textarea').focus(), document.querySelector('textarea').select())`);
  await command('Input.insertText', { text: 'Edited apartment label' }, sessionId);
  await key('Backspace', 8);
  assert.equal((await shapes()).length, 2, 'Backspace in editor does not delete shape');
  await button('Save');
  assert.equal((await shapes()).find(s => s.id === textShape.id).text, 'Edited apartment labe');
  assert.equal(await evaluate('!!document.querySelector("dialog[open]")'), false);
  await button('Edit Text');
  await command('Input.insertText', { text: 'Discard me' }, sessionId);
  await button('Cancel');
  assert.equal((await shapes()).find(s => s.id === textShape.id).text, 'Edited apartment labe');
  await button('Edit Text');
  await key('Escape', 27);
  assert.equal(await evaluate('!!document.querySelector("dialog[open]")'), false);
  console.log('PASS text selection after slight drag; Edit Text, Save, Cancel, Escape, safe Backspace');

  await evaluate(`document.querySelector('input').focus()`);
  await click(x + 230, y + 230);
  assert.equal(await evaluate(`document.activeElement.classList.contains('drawing-canvas')`), true, 'canvas takes focus from dimension input');
  await key('Delete', 46);
  assert.equal((await shapes()).length, 1);
  await button('Undo');
  assert.equal((await shapes()).length, 2);
  await click(x + 230, y + 230);
  await key('Backspace', 8);
  assert.equal((await shapes()).length, 1);
  await button('Undo');
  await click(x + 230, y + 230);
  await button('Delete selected');
  assert.equal((await shapes()).length, 1);
  console.log('PASS canvas focus after input, Delete, Backspace, Undo and Delete selected button');

  const initialCount = (await shapes()).length;
  const place = async (tool, px, py, expectedType) => {
    await button(tool);
    await click(px, py);
    const latest = (await shapes()).at(-1);
    assert.equal(latest.type, expectedType);
    assert.ok(latest.width > 0 && latest.height > 0);
  };
  await place('Rectangle', x + 620, y + 150, 'rectangle');
  await place('Circle', x + 760, y + 150, 'circle');
  await place('Triangle', x + 620, y + 300, 'triangle');
  await place('Arc', x + 760, y + 300, 'arc');
  assert.deepEqual((await shapes()).at(-1).startAngle, 0);
  assert.deepEqual((await shapes()).at(-1).endAngle, 180);
  await button('Line');
  await click(x + 500, y + 380);
  await click(x + 700, y + 430);
  assert.equal((await shapes()).at(-1).type, 'line');
  assert.equal((await shapes()).at(-1).points.length, 2);
  await button('Connected line');
  await click(x + 600, y + 500); await click(x + 700, y + 550); await click(x + 800, y + 480);
  await key('Enter', 13);
  assert.equal((await shapes()).at(-1).type, 'polyline');
  assert.equal((await shapes()).at(-1).points.length, 3);
  await button('Polygon');
  await click(x + 500, y + 600); await click(x + 650, y + 650); await click(x + 620, y + 520);
  await key('Enter', 13);
  assert.equal((await shapes()).at(-1).type, 'polygon');
  assert.equal((await shapes()).at(-1).points.length, 3);
  assert.equal((await shapes()).length, initialCount + 6);
  await button('Line');
  await click(x + 550, y + 650);
  await key('Escape', 27);
  await click(x + 580, y + 680);
  assert.equal((await shapes()).length, initialCount + 8, 'Escape cancels an unfinished line');
  console.log('PASS Phase 2 basic shape tools, connected paths, polygon completion and Escape cancellation');
} finally {
  clearTimeout(timeout);
  await command('Browser.close').catch(() => {});
  browser.kill();
}
