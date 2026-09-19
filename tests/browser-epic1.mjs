import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

// A disposable E-drive profile and a private pipe: no debugger network port or user profile.
const profile = resolve('node_modules/.cache/epic1-browser');
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
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    browser.stdio[3].write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}
const timeout = setTimeout(() => { console.error('Browser test timed out'); browser.kill(); process.exitCode = 1; }, 60000);
try {
  const { targetId } = await command('Target.createTarget', { url: 'http://127.0.0.1:4176/' });
  const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression: `(async()=>{${expression}})()`, awaitPromise: true, returnByValue: true }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const pause = () => new Promise(resolve => setTimeout(resolve,150));
  for(let i=0;i<50;i++) { if(await evaluate('return !!document.querySelector("canvas")')) break; await pause(); }
  await evaluate(`window.d=(await import('/src/store/useDrawingStore.ts')).useDrawingStore;
    window.e=(await import('/src/store/useEditorStore.ts')).useEditorStore;
    window.stage=()=>import('/src/services/projectFiles.ts').then(m=>m.getRegisteredStage());
    window.seed=()=>{d.getState().importState({...d.getState().document,shapes:[
      {id:'a',type:'rectangle',x:1000,y:1000,width:500,height:400,fill:'#123456'},
      {id:'b',type:'rectangle',x:2200,y:1400,width:300,height:500,fill:'#345678'},
      {id:'c',type:'circle',x:3300,y:1000,width:400,height:400,fill:'#567890'}]});
      e.getState().setTool('select');e.getState().selectMany(['a','b','c']);}; seed();`);
  await pause();
  const click = async label => { assert.ok(await evaluate(`const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)return false;b.click();return true;`),label + await evaluate('return JSON.stringify({selected:e.getState().selectedIds,body:document.body.innerText})')); await pause(); };
  const key = async (key,code,modifiers=0) => {
    await command('Input.dispatchKeyEvent',{type:'keyDown',key,windowsVirtualKeyCode:code,modifiers},sessionId);
    await command('Input.dispatchKeyEvent',{type:'keyUp',key,windowsVirtualKeyCode:code,modifiers},sessionId); await pause();
  };
  await pause(); await evaluate('seed();'); await pause(); await click('Copy'); await click('Paste');
  assert.equal(await evaluate('return d.getState().document.shapes.length'),6);
  await evaluate('document.activeElement?.blur();');
  await key('d',68,2); assert.equal(await evaluate('return d.getState().document.shapes.length'),9);
  await key('x',88,2); assert.equal(await evaluate('return d.getState().document.shapes.length'),6);
  await key('v',86,2); assert.equal(await evaluate('return d.getState().document.shapes.length'),9);
  await key('d',68); assert.equal(await evaluate('return e.getState().showProximityGuides'),false);
  await key('d',68); assert.equal(await evaluate('return e.getState().showProximityGuides'),true);

  await evaluate('seed();'); await pause(); await click('Align top');
  assert.deepEqual(await evaluate('return d.getState().document.shapes.map(s=>s.y)'),[1000,1000,1000]);
  await click('Distribute horizontally');
  const gaps=await evaluate('const [a,b,c]=d.getState().document.shapes;return [b.x-a.x-a.width,c.x-b.x-b.width]');
  assert.ok(Math.abs(gaps[0]-gaps[1])<1e-7);

  await evaluate('seed();e.getState().selectMany(["a"]);'); await pause(); await click('Move');
  assert.deepEqual(await evaluate('const t=(await stage()).findOne("Transformer");return [t.resizeEnabled(),t.rotateEnabled()]'),[false,false]);
  const point=await evaluate('const s=await stage();const r=s.container().getBoundingClientRect();const n=s.findOne("#a");const p=n.getAbsolutePosition();return {x:r.x+p.x+30,y:r.y+p.y+30,scale:s.scaleX()};');
  await command('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y},sessionId);
  await command('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1},sessionId);
  for(let i=1;i<=4;i++) await command('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+10*i,y:point.y+5*i,button:'left',buttons:1},sessionId);
  await command('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+40,y:point.y+20,button:'left',clickCount:1},sessionId);
  await pause();
  const moved=await evaluate('return d.getState().document.shapes[0]');
  assert.ok(Math.abs(moved.x-(1000+40/point.scale))<0.001,JSON.stringify(moved));
  assert.equal(moved.width,500); assert.equal(moved.height,400);

  // Move the entire selection with pointer input, preserving relative positions.
  await evaluate("seed();e.getState().setTool('move');"); await pause();
  await command('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y},sessionId);
  await command('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1},sessionId);
  for(let i=1;i<=4;i++) await command('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+10*i,y:point.y+5*i,button:'left',buttons:1},sessionId);
  await command('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+40,y:point.y+20,button:'left',clickCount:1},sessionId);
  await pause();
  const group=await evaluate('return d.getState().document.shapes.map(s=>[s.x,s.y])');
  console.log('group',group,await evaluate('return {past:d.getState().past.length,selected:e.getState().selectedIds}'));
  for(let i=0;i<3;i++) {assert.ok(Math.abs(group[i][0]-([1000,2200,3300][i]+40/point.scale))<0.001);}
  assert.equal(await evaluate('return d.getState().past.length'),1);

  // Exercise an actual Konva extension handle with pointer input.
  await evaluate(`seed();e.getState().selectMany(['a']);`); await pause();
  const handle=await evaluate(`const s=await stage();const r=s.container().getBoundingClientRect();
    const h=s.findOne('Transformer').findOne('.middle-right').getAbsolutePosition();return {x:r.x+h.x,y:r.y+h.y};`);
  await command('Input.dispatchMouseEvent',{type:'mousePressed',x:handle.x,y:handle.y,button:'left',clickCount:1},sessionId);
  await command('Input.dispatchMouseEvent',{type:'mouseMoved',x:handle.x+30,y:handle.y,button:'left',buttons:1},sessionId);
  await command('Input.dispatchMouseEvent',{type:'mouseReleased',x:handle.x+30,y:handle.y,button:'left',clickCount:1},sessionId);
  await pause();
  console.log('resize state', await evaluate("const n=(await stage()).findOne('#a'); return {shape:d.getState().document.shapes[0], scale:n.scale(), selected:e.getState().selectedIds,error:e.getState().error};"),handle); assert.ok(await evaluate('return d.getState().document.shapes[0].width>600'));
  assert.equal(await evaluate('return d.getState().document.shapes[0].height'),400);

  await evaluate(`seed();e.getState().setDisplayUnit('millimeters');`); await pause();
  await evaluate(`const input=[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Spacing gap')).querySelector('input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'75');input.dispatchEvent(new Event('input',{bubbles:true}));`);
  await pause();await click('Distribute horizontally');
  assert.deepEqual(await evaluate('const [a,b,c]=d.getState().document.shapes;return [b.x-a.x-a.width,c.x-b.x-b.width]'),[75,75]);

  await evaluate('seed();'); await pause();
  await evaluate(`const s=await stage();const t=s.findOne('Transformer');t.fire('transformstart');
    for(const id of ['a','b','c']) {const n=s.findOne('#'+id);n.scale({x:1.5,y:1.5});n.rotation(30);}
    t.fire('transformend');`); await pause();
  const transformed=await evaluate('return d.getState().document.shapes.map(s=>[s.width,s.rotation])');
  assert.deepEqual(transformed,[[750,30],[450,30],[600,30]]);
  assert.equal(await evaluate('return d.getState().past.length'),1);
  await key('z',90,2); assert.equal(await evaluate('return d.getState().document.shapes[0].width'),500);

  await evaluate('e.getState().setDisplayUnit("millimeters");e.getState().selectMany(["c"]);'); await pause();
  await evaluate(`const input=[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Radius')).querySelector('input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'300');input.dispatchEvent(new Event('input',{bubbles:true}));`);
  await pause(); await click('Apply radius');
  assert.equal(await evaluate('return d.getState().document.shapes.find(s=>s.id==="c").width'),600);
  await evaluate('e.getState().selectMany(["a","b","c"]);'); await pause();
  const screenshot=await command('Page.captureScreenshot',{format:'png'},sessionId);
  writeFileSync(resolve('node_modules/.cache/epic1-browser.png'),Buffer.from(screenshot.data,'base64'));
  console.log('Epic 1 browser checks passed: clipboard, shortcuts, alignment, distribution, Move drag, batch transform, undo, radius.');
} finally {
  clearTimeout(timeout);
  await command('Browser.close').catch(()=>{});
  browser.kill();
}
