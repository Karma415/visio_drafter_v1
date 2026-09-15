import { useState } from 'react';
import { useDrawingStore } from '../../store/useDrawingStore';
import { BASE_PIXELS_PER_MM, useEditorStore } from '../../store/useEditorStore';
import type { ActiveTool } from '../../store/useEditorStore';
import { DocumentSettings } from './DocumentSettings';
import { FileControls } from './FileControls';
import type { CommandTab } from './navigation';
import type { FurnitureCategory } from '../../domain/furniture';
import { FURNITURE_CATEGORIES, FURNITURE_DEFINITIONS, FURNITURE_KINDS } from '../../domain/furniture';
import { ToolIcon } from './ToolIcons';
import { DoorIcon, WindowIcon, OpeningIcon } from './ComponentIcons';

const TOOLS: { id: ActiveTool; label: string }[] = [
  { id: 'polyline', label: 'Connected line' }, { id: 'polygon', label: 'Polygon' },
  { id: 'circle', label: 'Circle' }, { id: 'triangle', label: 'Triangle' },
  { id: 'arc', label: 'Arc' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'door', label: 'Door' },
  { id: 'window', label: 'Window' },
  { id: 'measure', label: 'Measure' },
  { id: 'text', label: 'Text' },
];
const TAB_TOOLS: Record<CommandTab, ActiveTool[]> = {
  file: [],
  draw: ['polyline', 'polygon', 'circle', 'triangle', 'arc'],
  walls: ['door', 'window'],
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
  const [furnitureCategory, setFurnitureCategory] = useState<FurnitureCategory>('furniture');

  const tools = TOOLS.filter((tool) => TAB_TOOLS[activeTab].includes(tool.id));
  const categoryFurnitureKinds = FURNITURE_KINDS.filter(
    (kind) => FURNITURE_DEFINITIONS[kind].category === furnitureCategory,
  );

  return <aside className="sidebar" aria-label="Component library and properties">
    <h1>{drawing.name || "Karma's apartment draft"}</h1>
    <p className="muted">Actual measurements in inches · drawing scale 1:25</p>
    {error && <div role="alert" className="error">{error}<button type="button" className="btn-secondary" onClick={() => useEditorStore.getState().reportError(null)}>Dismiss</button></div>}
    {warning && <div role="alert" className="error"><p>{warning}</p>
      <button type="button" className="btn-warning" onClick={() => useDrawingStore.getState().enableRecovery()}>Resume recovery — replace saved copy</button></div>}
    {(tools.length > 0 || activeTab === 'view' || activeTab === 'furniture' || activeTab === 'walls') && <section aria-label="Component Library">
      {activeTab === 'furniture' ? (
        <>
          <h2>Furniture & Equipment</h2>
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
          <div className="library-grid">
            {categoryFurnitureKinds.map((kind) => {
              const def = FURNITURE_DEFINITIONS[kind];
              const isSelected = activeTool === 'furniture' && placedFurnitureKind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  className="library-tile-btn"
                  aria-pressed={isSelected}
                  onClick={() => useEditorStore.getState().setPlacedFurnitureKind(kind)}
                >
                  <ToolIcon tool="furniture" size={24} />
                  <span className="library-tile-label">{def.label}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : activeTab === 'walls' ? (
        <>
          <h2>Building Envelope</h2>
          <div className="library-grid">
            <button
              type="button"
              className="library-tile-btn"
              aria-pressed={activeTool === 'door'}
              title="Door (Click to place on wall)"
              onClick={() => {
                useEditorStore.getState().setTool('door');
                useEditorStore.getState().setPlacedDoorType('single_door');
              }}
            >
              <DoorIcon size={34} />
              <span className="library-tile-label">Door</span>
            </button>

            <button
              type="button"
              className="library-tile-btn"
              aria-pressed={activeTool === 'window'}
              title="Window (Click to place on wall)"
              onClick={() => {
                useEditorStore.getState().setTool('window');
                useEditorStore.getState().setPlacedWindowType('standard_window');
              }}
            >
              <WindowIcon size={34} />
              <span className="library-tile-label">Window</span>
            </button>

            <button
              type="button"
              className="library-tile-btn"
              aria-pressed={activeTool === 'door'}
              title="Opening (Cased wall walkthrough)"
              onClick={() => {
                useEditorStore.getState().setTool('door');
                useEditorStore.getState().setPlacedDoorType('single_door');
              }}
            >
              <OpeningIcon size={34} />
              <span className="library-tile-label">Opening</span>
            </button>
          </div>
        </>
      ) : tools.length > 0 ? (
        <div className="library-grid">{tools.map((tool) =>
          <button key={tool.id} type="button" className="library-tile-btn" aria-pressed={activeTool === tool.id} onClick={() => useEditorStore.getState().setTool(tool.id)}>
            <ToolIcon tool={tool.id} size={24} />
            <span className="library-tile-label">{tool.label}</span>
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
