import { useEffect, useState } from 'react';
import { useDrawingStore } from '../store/useDrawingStore';
import { saveRecovery } from '../services/recovery';

export function useLocalRecovery() {
  const [status, setStatus] = useState('Local recovery ready');
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function save() {
      const state = useDrawingStore.getState();
      if (!state.recoveryEnabled) return;
      try {
        saveRecovery(state.document);
        setStatus('Saved in this browser');
      } catch {
        setStatus('Recovery save failed. Download a drawing file to protect your work.');
      }
    }
    const unsubscribe = useDrawingStore.subscribe((state, previous) => {
      if (state.document === previous.document && state.recoveryEnabled === previous.recoveryEnabled) return;
      clearTimeout(timer);
      if (state.recoveryEnabled) {
        setStatus('Saving locally…');
        timer = setTimeout(save, 300);
      }
    });
    const flush = () => { clearTimeout(timer); save(); };
    const onHidden = () => { if (document.visibilityState === 'hidden') flush(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'karma-draft.document.v1' || event.key === null) {
        clearTimeout(timer);
        useDrawingStore.getState().pauseRecovery('Recovery changed in another tab. Automatic saving is paused to avoid overwriting it. Download this drawing before choosing which copy to keep.');
      }
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('storage', onStorage);
    return () => {
      clearTimeout(timer);
      unsubscribe();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return status;
}
