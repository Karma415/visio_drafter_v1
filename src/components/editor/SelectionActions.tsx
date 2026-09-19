import type { Shape } from '../../domain/document';
import { useState } from 'react';
import { parseInputToMm } from '../../utils/units';
import { runSelectionCommand } from '../../services/selectionCommands';
import { useDrawingStore } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';

export function SelectionActions({ shape, selectedIds = [] }: { shape: Shape | undefined, selectedIds?: string[] }) {
  const [gap, setGap] = useState('');
  const unit = useEditorStore(state => state.displayUnit);
  const perform = (action: () => void) => { try { action(); } catch (error) { useEditorStore.getState().reportError(error); } };
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
        runSelectionCommand('delete');
      }}>Delete selected</button>
    </div>}
    {selectedIds.length >= 2 && <div className="button-row" aria-label="Align selection">
      {(['top', 'bottom', 'left', 'right'] as const).map(edge => <button key={edge} type="button" className="btn-secondary"
        onClick={() => perform(() => useDrawingStore.getState().alignSelection(selectedIds, edge))}>Align {edge}</button>)}
    </div>}
    {selectedIds.length >= 3 && <>
      <label>Spacing gap — {unit}<input value={gap} placeholder="Automatic" inputMode="decimal" onChange={event => setGap(event.target.value)} /></label>
      <div className="button-row">
        {(['horizontal', 'vertical'] as const).map(axis => <button key={axis} type="button" className="btn-secondary"
          onClick={() => perform(() => {
            const gapMm = gap.trim() ? parseInputToMm(gap, unit, NaN) : undefined;
            useDrawingStore.getState().distributeSelection(selectedIds, axis, gapMm);
          })}>Distribute {axis === 'horizontal' ? 'horizontally' : 'vertically'}</button>)}
      </div>
      <small>Leave blank for equal gaps within the current span. An explicit gap keeps the first item fixed.</small>
    </>}
  </section>;
}
