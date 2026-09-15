import { useDrawingStore } from '../../store/useDrawingStore';
import { BASE_PIXELS_PER_MM, useEditorStore } from '../../store/useEditorStore';
import type { ActiveTool } from '../../store/useEditorStore';
import { DocumentSettings } from './DocumentSettings';
import { FileControls } from './FileControls';
import type { CommandTab } from './navigation';

const TOOLS: { id: ActiveTool; label: string }[] = [
  { id: 'select', label: 'Select / pan' }, { id: 'line', label: 'Line' },
  { id: 'polyline', label: 'Connected line' }, { id: 'polygon', label: 'Polygon' },
  { id: 'rectangle', label: 'Rectangle' }, { id: 'circle', label: 'Circle' },
  { id: 'triangle', label: 'Triangle' }, { id: 'arc', label: 'Arc' },
  { id: 'wall', label: 'Wall' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'measure', label: 'Measure' },
  { id: 'text', label: 'Text' },
];
const TAB_TOOLS: Record<CommandTab, ActiveTool[]> = {
  file: [],
  draw: ['select', 'line', 'polyline', 'polygon', 'rectangle', 'circle', 'triangle', 'arc'],
  walls: ['wall'],
  annotate: ['measure', 'text'],
  furniture: ['furniture'],
  view: [],
};
export function Sidebar({ recoveryStatus, activeTab }: { recoveryStatus: string; activeTab: CommandTab }) {
  const drawing = useDrawingStore((state) => state.document);
  const canUndo = useDrawingStore((state) => state.past.length > 0);
  const canRedo = useDrawingStore((state) => state.future.length > 0);
  const warning = useDrawingStore((state) => state.recoveryWarning);
  const activeTool = useEditorStore((state) => state.activeTool);
  const scale = useEditorStore((state) => state.scale);
  const error = useEditorStore((state) => state.error);
  const snapStatus = useEditorStore((state) => state.snapStatus);
  const tools = TOOLS.filter((tool) => TAB_TOOLS[activeTab].includes(tool.id));
  return <aside className="sidebar" aria-label="Drawing tools and properties">
    <h1>Karma's apartment draft</h1>
    <p className="muted">Actual measurements in inches · drawing scale 1:25</p>
    {error && <div role="alert" className="error">{error}<button type="button" className="btn-secondary" onClick={() => useEditorStore.getState().reportError(null)}>Dismiss</button></div>}
    {warning && <div role="alert" className="error"><p>{warning}</p>
      <button type="button" className="btn-warning" onClick={() => useDrawingStore.getState().enableRecovery()}>Resume recovery — replace saved copy</button></div>}
    {(tools.length > 0 || activeTab === 'view') && <section aria-label="Tools">{tools.length > 0 && <div className="tool-grid">{tools.map((tool) =>
      <button key={tool.id} type="button" className="tool-btn" aria-pressed={activeTool === tool.id} onClick={() => useEditorStore.getState().setTool(tool.id)}>{tool.label}</button>,
    )}</div>}
      <div className="button-row"><button type="button" className="btn-secondary" disabled={!canUndo} onClick={() => useDrawingStore.getState().undo()}>Undo</button>
        <button type="button" className="btn-secondary" disabled={!canRedo} onClick={() => useDrawingStore.getState().redo()}>Redo</button>
        <button type="button" className="btn-secondary" onClick={() => useEditorStore.getState().resetView()}>Reset view</button></div>
      <p>Zoom: {Math.round(scale / BASE_PIXELS_PER_MM * 100)}%</p>
      <p className="snap-status" role="status">Snapping: {snapStatus ?? 'Grid and object anchors'}. Hold Alt for free placement.</p>
    </section>}
    {activeTab === 'file' && <FileControls />}
    {activeTab === 'view' && <DocumentSettings key={`${drawing.name}:${drawing.gridMm}`} document={drawing} />}
    <p role="status">{warning ? 'Automatic recovery paused' : recoveryStatus}</p>
    <small>Local-only drawing. Browser storage and downloaded files are not encrypted by this app. Use your own trusted computer.</small>
  </aside>;
}
