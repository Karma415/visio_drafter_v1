import { createDocument } from '../domain/document';
import type { DrawingDocument } from '../domain/document';
import { decodeDrawing, encodeDrawing } from './drawingFiles';

const KEY = 'karma-draft.document.v1';
const BACKUP_KEY = `${KEY}.previous`;
export interface Recovery {
  document: DrawingDocument;
  warning: string | null;
  enabled: boolean;
}

export function loadRecovery(): Recovery {
  try {
    const current = localStorage.getItem(KEY);
    if (!current) {
      const backup = localStorage.getItem(BACKUP_KEY);
      return backup
        ? { document: decodeDrawing(backup), warning: 'The latest recovery copy is missing. The previous copy was restored. Download it before resuming recovery.', enabled: false }
        : { document: createDocument(), warning: null, enabled: true };
    }
    try {
      return { document: decodeDrawing(current), warning: null, enabled: true };
    } catch {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (backup) {
        return {
          document: decodeDrawing(backup), enabled: false,
          warning: 'The latest recovery copy is damaged. The previous valid copy was restored. Download it before resuming recovery.',
        };
      }
      throw new Error('Recovery data is damaged.');
    }
  } catch {
    return {
      document: createDocument(), enabled: false,
      warning: 'Local recovery could not be read. Existing stored data has not been overwritten. Open a downloaded drawing or save your work to a file.',
    };
  }
}

export function saveRecovery(document: DrawingDocument): void {
  const next = encodeDrawing(document);
  const previous = localStorage.getItem(KEY);
  if (previous === next) return;
  if (previous) {
    // Do not let a damaged latest copy replace a valid backup.
    let validPrevious = false;
    try {
      decodeDrawing(previous);
      validPrevious = true;
    } catch {
      // Keep the existing backup. The caller explicitly enabled recovery.
    }
    // Storage failures must surface; do not silently replace the latest without its backup.
    if (validPrevious) localStorage.setItem(BACKUP_KEY, previous);
  }
  localStorage.setItem(KEY, next);
}
