import { useDrawingStore } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';
import { MeasurementPanel } from './MeasurementPanel';
import { SelectionActions } from './SelectionActions';

/** Selection-only controls live here so tools and object properties do not mix. */
export function InspectorPanel() {
  const drawing = useDrawingStore((state) => state.document);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const selectedId = selectedIds[0] ?? null;
  const activeTool = useEditorStore((state) => state.activeTool);
  const selectedShape = activeTool === 'select' ? drawing.shapes.find((shape) => shape.id === selectedId) : undefined;
  return <aside className="inspector" aria-label="Selected object properties">
    <SelectionActions shape={selectedShape} selectedIds={selectedIds} />
    {selectedShape
      ? <MeasurementPanel key={`${selectedShape.id}:${selectedShape.x}:${selectedShape.y}:${selectedShape.width}:${selectedShape.height}:${selectedShape.rotation ?? 0}:${selectedShape.startAngle ?? 0}:${selectedShape.endAngle ?? 180}:${selectedShape.wallType ?? ''}:${selectedShape.wallThicknessMm ?? 0}:${selectedShape.furnitureKind ?? ''}:${selectedShape.text ?? ''}:${selectedShape.fontSize ?? ''}:${selectedShape.fill ?? ''}`} shape={selectedShape} selectedIds={selectedIds} unit={drawing.displayUnit} />
      : <section><h2>Inspector</h2><p className="muted">Select an object to edit its dimensions, rotation, wall assembly, or furniture type.</p></section>}
  </aside>;
}
