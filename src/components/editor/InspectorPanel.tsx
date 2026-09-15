import { useDrawingStore } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';
import { MeasurementPanel } from './MeasurementPanel';
import { SelectionActions } from './SelectionActions';

/** Selection-only controls live here so tools and object properties do not mix. */
export function InspectorPanel() {
  const drawing = useDrawingStore((state) => state.document);
  const selectedId = useEditorStore((state) => state.selectedId);
  const activeTool = useEditorStore((state) => state.activeTool);
  const selectedShape = activeTool === 'select' ? drawing.shapes.find((shape) => shape.id === selectedId) : undefined;
  return <aside className="inspector" aria-label="Selected object properties">
    <SelectionActions shape={selectedShape} />
    {selectedShape
      ? <MeasurementPanel key={`${selectedShape.id}:${selectedShape.x}:${selectedShape.y}:${selectedShape.width}:${selectedShape.height}:${selectedShape.rotation ?? 0}:${selectedShape.startAngle ?? 0}:${selectedShape.endAngle ?? 180}:${selectedShape.wallType ?? ''}:${selectedShape.wallThicknessMm ?? 0}:${selectedShape.furnitureKind ?? ''}`} shape={selectedShape} unit={drawing.displayUnit} />
      : <section><h2>Inspector</h2><p className="muted">Select an object to edit its dimensions, rotation, wall assembly, or furniture type.</p></section>}
  </aside>;
}
