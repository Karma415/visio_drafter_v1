import type { Shape } from '../../domain/document';
import { useDrawingStore } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';

export function SelectionActions({ shape, selectedIds = [] }: { shape: Shape | undefined, selectedIds?: string[] }) {
  const drawing = useDrawingStore.getState().document;
  const allSelectedShapes = selectedIds.map(id => drawing.shapes.find(s => s.id === id)).filter(Boolean) as Shape[];
  const allWalls = allSelectedShapes.length > 1 && allSelectedShapes.every(s => s.type === 'wall');

  return <section className="selection-actions" aria-label="Selection actions">
    <p role="status">{selectedIds.length > 1 ? `${selectedIds.length} items selected` : shape ? `Selected: ${shape.type}` : 'No shape selected'}</p>
    {shape?.type === 'arc' && selectedIds.length === 1 && <small>Change Arc start and Arc end in the selected arc properties directly below, then choose Apply properties.</small>}
    {selectedIds.length > 0 && <div className="button-row">
      {shape?.type === 'text' && selectedIds.length === 1 && <button type="button" className="btn-secondary" onClick={() => useEditorStore.getState().editText(shape.id)}>Edit Text</button>}
      {shape?.type === 'wall' && shape.points && shape.points.length > 4 && selectedIds.length === 1 && (
        <button type="button" className="btn-secondary" onClick={() => {
          useDrawingStore.getState().ungroupShape(shape.id);
          useEditorStore.getState().select(null);
        }}>Ungroup Wall</button>
      )}
      {allWalls && (
        <button type="button" className="btn-secondary" onClick={() => {
          useDrawingStore.getState().groupWalls(selectedIds);
        }}>Group Walls</button>
      )}
      <button type="button" className="btn-destructive" onClick={() => {
        selectedIds.forEach(id => useDrawingStore.getState().deleteShape(id));
        useEditorStore.getState().select(null);
      }}>Delete selected</button>
    </div>}
  </section>;
}
