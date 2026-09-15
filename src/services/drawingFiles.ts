import type { DrawingDocument } from '../domain/document';
import { MAX_FILE_BYTES } from '../domain/document';
import { validateDocument } from '../domain/validation';

export function decodeDrawing(text: string): DrawingDocument {
  if (new Blob([text]).size > MAX_FILE_BYTES) throw new Error('Drawing exceeds the 2 MB file limit.');
  return validateDocument(JSON.parse(text) as unknown);
}

export function encodeDrawing(document: DrawingDocument): string {
  const text = JSON.stringify(validateDocument(document), null, 2);
  if (new Blob([text]).size > MAX_FILE_BYTES) throw new Error('Drawing exceeds the 2 MB file limit.');
  return text;
}

export async function readDrawing(file: File): Promise<DrawingDocument> {
  if (file.size > MAX_FILE_BYTES) throw new Error('Drawing exceeds the 2 MB file limit.');
  return decodeDrawing(await file.text());
}

export function downloadDrawing(document: DrawingDocument): void {
  const url = URL.createObjectURL(new Blob([encodeDrawing(document)], { type: 'application/json' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `${document.name.replace(/[^a-z0-9_-]/gi, '_') || 'apartment'}.karma.json`;
  window.document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
