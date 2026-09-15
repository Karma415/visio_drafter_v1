import type { Shape } from '../../domain/document';
import { useDrawingStore } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';

export function SelectionActions({ shape }: { shape: Shape | undefined }) {
  return <section className="selection-actions" aria-label="Selection actions">
    <p role="status">{shape ? `Selected: ${shape.type}` : 'No shape selected'}</p>
    {shape?.type === 'arc' && <small>Change Arc start and Arc end in the selected arc properties directly below, then choose Apply properties.</small>}
    {shape && <div className="button-row">
      {shape.type === 'text' && <button type="button" className="btn-secondary" onClick={() => useEditorStore.getState().editText(shape.id)}>Edit Text</button>}
      <button type="button" className="btn-destructive" onClick={() => {
        useDrawingStore.getState().deleteShape(shape.id);
        useEditorStore.getState().select(null);
      }}>Delete selected</button>
    </div>}
  </section>;
}
