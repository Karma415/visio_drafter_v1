import type Konva from 'konva';
import { useDrawingStore } from '../store/useDrawingStore';
import { useEditorStore } from '../store/useEditorStore';
import { validateDocument } from '../domain/validation';

let konvaStage: Konva.Stage | null = null;

export function registerStage(stage: Konva.Stage | null): void {
  konvaStage = stage;
}

export function getRegisteredStage(): Konva.Stage | null {
  return konvaStage;
}

/**
 * Phase 1: Save Project
 * Serializes the current Zustand state and triggers a browser download for floorplan.json.
 */
export function saveProject(): void {
  try {
    const document = useDrawingStore.getState().exportState();
    const json = JSON.stringify(document, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'floorplan.json';
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    useEditorStore.getState().reportError(err);
  }
}

/**
 * Phase 1: Load Project
 * Opens/reads a .json file, validates it, and replaces the current Zustand state.
 */
export async function loadProjectFile(file: File): Promise<void> {
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const validated = validateDocument(json);
    useDrawingStore.getState().importState(validated);
    useEditorStore.getState().select(null);
    useEditorStore.getState().resetView();
  } catch (err) {
    useEditorStore.getState().reportError(err);
    throw err;
  }
}

/**
 * Phase 2: Export Image (PNG)
 * Uses Konva's native stage.toDataURL() method to capture the current canvas.
 * Triggers a download for floorplan.png.
 */
export function exportImage(): void {
  try {
    if (!konvaStage) {
      throw new Error('Canvas stage is not available for export. Please interact with the canvas first.');
    }
    const dataUrl = konvaStage.toDataURL();
    const link = window.document.createElement('a');
    link.href = dataUrl;
    link.download = 'floorplan.png';
    window.document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    useEditorStore.getState().reportError(err);
  }
}
