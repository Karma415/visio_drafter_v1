import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const profile = resolve('node_modules/.cache/selection-browser');
mkdirSync(profile, { recursive: true });
const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-pipe', '--no-first-run', '--disable-background-networking',
  '--window-size=1280,900', `--user-data-dir=${profile}`, 'about:blank',
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
    if (task) { pending.delete(message.id); message.error ? task.reject(new Error(JSON.stringify(message.error))) : task.resolve(message.result); }
  }
});
function command(method, params = {}, sessionId) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    browser.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}
try {
  const { targetId } = await command('Target.createTarget', { url: 'http://127.0.0.1:4175/' });
  const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
  const evaluate = async (expression) => {
    const result = await command('Runtime.evaluate', { expression: `(async () => (${expression}))()`, awaitPromise: true, returnByValue: true }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async (expression, label) => {
    for (let index = 0; index < 30; index++) {
      if (await evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail(`Timed out: ${label}; body: ${await evaluate('document.body.innerText')}`);
  };
  const clickButton = async (label) => {
    await evaluate(`Array.from(document.querySelectorAll('button')).find((button) => button.textContent === ${JSON.stringify(label)})?.click()`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  };
  const canvasBounds = async () => JSON.parse(await evaluate(`JSON.stringify(document.querySelector('.drawing-canvas').getBoundingClientRect().toJSON())`));
  const clickCanvas = async (x, y) => {
    await command('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }, sessionId);
    await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 120));
  };
  const key = async (key, code) => {
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode: code }, sessionId);
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: code }, sessionId);
    await new Promise((resolve) => setTimeout(resolve, 120));
  };
  await waitFor('!!document.querySelector("canvas")', 'canvas load');
  const bounds = await canvasBounds();
  const x = bounds.x;
  const y = bounds.y;
  const canvasX = (ratio) => x + bounds.width * ratio;
  await clickButton('Rectangle');
  await clickCanvas(x + 180, y + 180);
  await waitFor(`document.body.innerText.includes('Selected rectangle')`, 'rectangle selection');
  await waitFor(`window.Konva.stages[0].findOne('Transformer').nodes().length === 1`, 'rectangle handles');

  const placements = [
    ['Circle', 'Selected circle', canvasX(0.55), y + 150],
    ['Triangle', 'Selected triangle', canvasX(0.4), y + 300],
    ['Arc', 'Selected arc', canvasX(0.62), y + 300],
  ];
  for (const [tool, selected, px, py] of placements) {
    await clickButton(tool);
    await clickCanvas(px, py);
    await waitFor(`document.body.innerText.includes(${JSON.stringify(selected)})`, `${tool} selection`);
  }
  await clickButton('Line');
  await clickCanvas(canvasX(0.64), y + 300); await clickCanvas(canvasX(0.82), y + 350);
  await waitFor(`document.body.innerText.includes('Selected line')`, 'line completion');
  await clickButton('Walls');
  await clickButton('Wall');
  await clickCanvas(canvasX(0.68), y + 620); await clickCanvas(canvasX(0.88), y + 620);
  await waitFor(`document.body.innerText.includes('Selected wall')`, 'wall completion');
  await waitFor(`document.body.innerText.includes('Wall assembly')`, 'wall properties');
  await clickButton('Annotate');
  await clickButton('Measure');
  await clickCanvas(canvasX(0.64), y + 720); await clickCanvas(canvasX(0.82), y + 720);
  await waitFor(`window.Konva.stages[0].find('Text').some((node) => node.text().includes('in'))`, 'temporary measurement label');
  await waitFor(`document.body.innerText.includes('Selected measurement')`, 'saved measurement selection');
  await clickButton('Delete selected');
  await clickButton('Tools');
  await clickButton('Connected line');
  await clickCanvas(canvasX(0.4), y + 500); await clickCanvas(canvasX(0.52), y + 540); await clickCanvas(canvasX(0.64), y + 480); await key('Enter', 13);
  await waitFor(`document.body.innerText.includes('Selected polyline')`, 'polyline completion');
  await clickButton('Polygon');
  await clickCanvas(canvasX(0.66), y + 500); await clickCanvas(canvasX(0.78), y + 540); await clickCanvas(canvasX(0.72), y + 440); await key('Enter', 13);
  await waitFor(`document.body.innerText.includes('Selected polygon')`, 'polygon completion');
  await clickButton('Connected line');
  await clickCanvas(canvasX(0.48), y + 650); await clickCanvas(canvasX(0.6), y + 690);
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', x: canvasX(0.72), y: y + 650, button: 'left', clickCount: 2 }, sessionId);
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', x: canvasX(0.72), y: y + 650, button: 'left', clickCount: 2 }, sessionId);
  await waitFor(`document.body.innerText.includes('Selected polyline')`, 'polyline double-click completion');
  await clickButton('Line');
  await clickCanvas(canvasX(0.32), y + 680); await key('Escape', 27);
  assert.equal(await evaluate(`document.body.innerText.includes('Click the second point to finish the line.')`), false);

  await clickButton('Furniture');
  await clickButton('Electronics');
  await clickButton('TV / Media unit');
  await clickCanvas(canvasX(0.2), y + 250);
  await waitFor(`document.body.innerText.includes('Selected furniture')`, 'tv unit selection');
  await waitFor(`document.querySelector('select').value === 'tv_unit'`, 'tv unit select value');

  await clickButton('Appliances');
  await clickButton('Washer / Dryer');
  await clickCanvas(canvasX(0.2), y + 400);
  await waitFor(`document.body.innerText.includes('Selected furniture')`, 'washer dryer selection');
  await waitFor(`document.querySelector('select').value === 'washer_dryer'`, 'washer dryer select value');

  await clickButton('Fixtures');
  await clickButton('Toilet');
  await clickCanvas(canvasX(0.2), y + 550);
  await waitFor(`document.body.innerText.includes('Selected furniture')`, 'toilet selection');
  await waitFor(`document.querySelector('select').value === 'toilet'`, 'toilet select value');

  console.log('PASS live DOM selection, handles, wall, saved measure, furniture/fixtures/electronics/appliances tabs, Enter/double-click path completion, and Escape cancellation');
} finally {
  await command('Browser.close').catch(() => {});
  browser.kill();
}
