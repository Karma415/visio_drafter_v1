import { useState } from 'react';
import { useDrawingStore } from '../../store/useDrawingStore';
import { BASE_PIXELS_PER_MM, useEditorStore } from '../../store/useEditorStore';
import type { ActiveTool } from '../../store/useEditorStore';
import { DocumentSettings } from './DocumentSettings';
import { FileControls } from './FileControls';
import type { CommandTab } from './navigation';
import type { FurnitureCategory } from '../../domain/furniture';
import { FURNITURE_CATEGORIES, FURNITURE_DEFINITIONS, FURNITURE_KINDS } from '../../domain/furniture';
import { DOOR_TYPES, OPENING_DEFINITIONS, WINDOW_TYPES } from '../../domain/doors';
import { ToolIcon } from './ToolIcons';

const TOOLS: { id: ActiveTool; label: string }[] = [
  { id: 'select', label: 'Select / pan' }, { id: 'line', label: 'Line' },
  { id: 'polyline', label: 'Connected line' }, { id: 'polygon', label: 'Polygon' },
  { id: 'rectangle', label: 'Rectangle' }, { id: 'circle', label: 'Circle' },
  { id: 'triangle', label: 'Triangle' }, { id: 'arc', label: 'Arc' },
  { id: 'wall', label: 'Wall' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'door', label: 'Door' },
  { id: 'window', label: 'Window' },
  { id: 'measure', label: 'Measure' },
  { id: 'text', label: 'Text' },
];
const TAB_TOOLS: Record<CommandTab, ActiveTool[]> = {
  file: [],
  draw: ['select', 'line', 'polyline', 'polygon', 'rectangle', 'circle', 'triangle', 'arc'],
  walls: ['wall', 'door', 'window'],
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
  const placedFurnitureKind = useEditorStore((state) => state.placedFurnitureKind);
  const placedDoorType = useEditorStore((state) => state.placedDoorType);
  const placedWindowType = useEditorStore((state) => state.placedWindowType);
  const [furnitureCategory, setFurnitureCategory] = useState<FurnitureCategory>('furniture');

  const tools = TOOLS.filter((tool) => TAB_TOOLS[activeTab].includes(tool.id));
  const categoryFurnitureKinds = FURNITURE_KINDS.filter(
    (kind) => FURNITURE_DEFINITIONS[kind].category === furnitureCategory,
  );

  return <aside className="sidebar" aria-label="Drawing tools and properties">
    <h1>{drawing.name || "Karma's apartment draft"}</h1>
    <p className="muted">Actual measurements in inches · drawing scale 1:25</p>
    {error && <div role="alert" className="error">{error}<button type="button" className="btn-secondary" onClick={() => useEditorStore.getState().reportError(null)}>Dismiss</button></div>}
    {warning && <div role="alert" className="error"><p>{warning}</p>
      <button type="button" className="btn-warning" onClick={() => useDrawingStore.getState().enableRecovery()}>Resume recovery — replace saved copy</button></div>}
    {(tools.length > 0 || activeTab === 'view' || activeTab === 'furniture' || activeTab === 'walls') && <section aria-label="Tools">
      {activeTab === 'furniture' ? (
        <>
          <div className="sub-category-tabs" role="tablist" aria-label="Furniture category">
            {FURNITURE_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                role="tab"
                className="sub-tab-btn"
                aria-selected={furnitureCategory === category.id}
                onClick={() => setFurnitureCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
          <div className="tool-grid">
            {categoryFurnitureKinds.map((kind) => {
              const def = FURNITURE_DEFINITIONS[kind];
              const isSelected = activeTool === 'furniture' && placedFurnitureKind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  className="tool-btn"
                  aria-pressed={isSelected}
                  onClick={() => useEditorStore.getState().setPlacedFurnitureKind(kind)}
                >
                  {def.label}
                </button>
              );
            })}
          </div>
        </>
      ) : activeTab === 'walls' ? (
        <>
          <div className="tool-grid">
            <button
              type="button"
              className="tool-btn"
              aria-pressed={activeTool === 'wall'}
              onClick={() => useEditorStore.getState().setTool('wall')}
            >
              <ToolIcon tool="wall" />
              <span>Wall</span>
            </button>
          </div>
          <h2>Doors & Openings</h2>
          <div className="tool-grid">
            {DOOR_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="tool-btn"
                aria-pressed={activeTool === 'door' && placedDoorType === type}
                onClick={() => useEditorStore.getState().setPlacedDoorType(type)}
              >
                <ToolIcon tool="door" />
                <span>{OPENING_DEFINITIONS[type].label}</span>
              </button>
            ))}
          </div>
          <h2>Windows</h2>
          <div className="tool-grid">
            {WINDOW_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="tool-btn"
                aria-pressed={activeTool === 'window' && placedWindowType === type}
                onClick={() => useEditorStore.getState().setPlacedWindowType(type)}
              >
                <ToolIcon tool="window" />
                <span>{OPENING_DEFINITIONS[type].label}</span>
              </button>
            ))}
          </div>
        </>
      ) : tools.length > 0 ? (
        <div className="tool-grid">{tools.map((tool) =>
          <button key={tool.id} type="button" className="tool-btn" aria-pressed={activeTool === tool.id} onClick={() => useEditorStore.getState().setTool(tool.id)}>
            <ToolIcon tool={tool.id} />
            <span>{tool.label}</span>
          </button>,
        )}</div>
      ) : null}
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
