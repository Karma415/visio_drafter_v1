import { useRef, useState } from 'react';
import type { DrawingDocument } from '../../domain/document';
import { readDrawing, downloadDrawing } from '../../services/drawingFiles';
import { useDrawingStore } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';
import { Modal } from './Modal';

export function FileControls() {
  const input = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<DrawingDocument | null>(null);
  const [reading, setReading] = useState(false);
  function save() {
    try { downloadDrawing(useDrawingStore.getState().document); }
    catch (error) { useEditorStore.getState().reportError(error); }
  }
  return <section>
    <h2>Drawing file</h2>
    <div className="button-row"><button onClick={save}>Download drawing</button>
      <button disabled={reading} onClick={() => input.current?.click()}>{reading ? 'Reading…' : 'Open drawing'}</button></div>
    <input ref={input} type="file" accept=".json,application/json" hidden onChange={async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      setReading(true);
      try { setPending(await readDrawing(file)); }
      catch (error) { useEditorStore.getState().reportError(error); }
      finally { setReading(false); }
    }} />
    <small>Files stay on your computer. Choose an E: folder in your browser's download settings. Download regularly; browser recovery is not a permanent backup.</small>
    {pending && <Modal title="Open drawing?" onCancel={() => setPending(null)}>
      <p>Open “{pending.name}” ({pending.shapes.length} shapes)? This replaces the current canvas. Download the current drawing first if you want a separate copy.</p>
      <div className="button-row"><button onClick={save}>Download current</button><button onClick={() => setPending(null)}>Cancel</button>
        <button onClick={() => {
          useDrawingStore.getState().openDocument(pending);
          useEditorStore.getState().resetView();
          setPending(null);
        }}>Open</button></div>
    </Modal>}
  </section>;
}
