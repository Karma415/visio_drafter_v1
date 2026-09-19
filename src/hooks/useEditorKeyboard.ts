import { useEffect } from 'react';
import { useDrawingStore } from '../store/useDrawingStore';
import { useEditorStore } from '../store/useEditorStore';
import { runSelectionCommand } from '../services/selectionCommands';

export function useEditorKeyboard() {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      if (event.isComposing || document.querySelector('dialog[open]') ||
        (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select')))) return;
      const drawing = useDrawingStore.getState();
      const editor = useEditorStore.getState();
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && !event.altKey && ['c', 'x', 'v', 'd'].includes(key)) {
        event.preventDefault();
        if (!event.repeat) runSelectionCommand(key === 'c' ? 'copy' : key === 'x' ? 'cut' : key === 'v' ? 'paste' : 'duplicate');
        return;
      }
      if (event.key.toLowerCase() === 'd' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.repeat) {
        event.preventDefault();
        editor.toggleProximityGuides();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) drawing.redo(); else drawing.undo();
      } else if (editor.selectedIds.length > 0 && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        runSelectionCommand('delete');
      } else if (!event.ctrlKey && !event.metaKey && !event.altKey && (key === 'm' || key === 'v')) {
        editor.setTool(key === 'm' ? 'move' : 'select');
      } else if (event.key === 'Escape') {
        editor.select(null);
        editor.setTool('select');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
}
