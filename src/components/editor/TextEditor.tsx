import { useState } from 'react';
import type { Shape } from '../../domain/document';
import { MAX_TEXT_LENGTH } from '../../domain/document';
import { useDrawingStore } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';
import { Modal } from './Modal';

export function TextEditor({ shape }: { shape: Shape }) {
  const [text, setText] = useState(shape.text ?? '');
  const close = () => useEditorStore.getState().editText(null);
  return <Modal title="Edit Text" onCancel={close}>
    <form onSubmit={(event) => {
      event.preventDefault();
      try {
        useDrawingStore.getState().updateText(shape.id, text);
        close();
      } catch (error) { useEditorStore.getState().reportError(error); }
    }}>
      <label htmlFor="shape-text">Text content</label>
      <textarea id="shape-text" rows={6} maxLength={MAX_TEXT_LENGTH} value={text}
        onChange={(event) => setText(event.target.value)} />
      <p>Enter adds a new line. Save applies your changes; Escape cancels.</p>
      <div className="button-row"><button type="button" onClick={close}>Cancel</button><button type="submit">Save</button></div>
    </form>
  </Modal>;
}
