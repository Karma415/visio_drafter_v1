import { useDrawingStore } from '../store/useDrawingStore';
import { useEditorStore } from '../store/useEditorStore';

export type SelectionCommand = 'copy' | 'cut' | 'paste' | 'duplicate' | 'delete';
export function runSelectionCommand(command: SelectionCommand): void {
  const drawing = useDrawingStore.getState();
  const editor = useEditorStore.getState();
  const ids = editor.selectedIds;
  try {
    if (command === 'copy') drawing.copyShapes(ids);
    if (command === 'cut') { drawing.cutShapes(ids); editor.select(null); }
    if (command === 'delete') { drawing.deleteShapes(ids); editor.select(null); }
    if (command === 'paste' || command === 'duplicate') {
      const added = command === 'paste' ? drawing.pasteShapes() : drawing.duplicateShapes(ids);
      if (added.length) { editor.setTool('select'); editor.selectMany(added); }
    }
  } catch (error) { editor.reportError(error); }
}
