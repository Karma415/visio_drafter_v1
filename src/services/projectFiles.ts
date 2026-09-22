import type Konva from 'konva';
import { useDrawingStore } from '../store/useDrawingStore';
import { useEditorStore } from '../store/useEditorStore';
import { validateDocument } from '../domain/validation';
import { jsPDF } from 'jspdf';

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


export async function exportPdf(): Promise<void> {
  try {
    if (!konvaStage) throw new Error('Canvas stage is not available for export.');
    
    const paperSize = useEditorStore.getState().paperSize;
    const drawingScale = useEditorStore.getState().drawingScale;
    const sizes = {
      Letter: { w: 11, h: 8.5 },
      Tabloid: { w: 17, h: 11 },
      Arch_C: { w: 24, h: 18 },
      Arch_D: { w: 36, h: 24 }
    };
    const size = sizes[paperSize] || sizes.Arch_D;
    
    // Konva renders at physical mm. Paper size in mm = size * 25.4 * drawingScale.
    const inchesToMm = 25.4;
    const paperRealWidthMm = size.w * inchesToMm * drawingScale;
    const paperRealHeightMm = size.h * inchesToMm * drawingScale;
    
    // We want a high-res crop of just the paper region from (0,0) to paper width/height
    const dataUrl = konvaStage.toDataURL({
      pixelRatio: 3, // High-res
      x: 0,
      y: 0,
      width: paperRealWidthMm,
      height: paperRealHeightMm
    });
    
    // Create PDF in landscape
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'in',
      format: [size.w, size.h]
    });
    
    pdf.addImage(dataUrl, 'PNG', 0, 0, size.w, size.h);
    pdf.save('floorplan.pdf');
  } catch (err) {
    useEditorStore.getState().reportError(err);
  }
}
