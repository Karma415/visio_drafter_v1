import { useEffect } from 'react';
import { useDrawingStore } from '../store/useDrawingStore';
import { useEditorStore } from '../store/useEditorStore';

export function useEditorKeyboard() {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const target = event.target;
      if (event.isComposing || document.querySelector('dialog[open]') ||
        (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select')))) return;
      const drawing = useDrawingStore.getState();
      const editor = useEditorStore.getState();
      if (event.key.toLowerCase() === 'd' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.repeat) {
        event.preventDefault();
        editor.toggleProximityGuides();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) drawing.redo(); else drawing.undo();
      } else if (editor.selectedIds.length > 0 && (event.key === 'Delete' || event.key === 'Backspace')) {
        editor.selectedIds.forEach(id => drawing.deleteShape(id));
        editor.select(null);
      } else if (event.key === 'Escape') {
        editor.select(null);
        editor.setTool('select');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
}
