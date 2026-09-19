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
import { FurnitureIcon } from './FurnitureIcons';

const TOOLS: { id: ActiveTool; label: string }[] = [
  { id: 'polyline', label: 'Connected line' }, { id: 'polygon', label: 'Polygon' },
  { id: 'square', label: 'Square' }, { id: 'circle', label: 'Circle' }, { id: 'triangle', label: 'Triangle' },
  { id: 'arc', label: 'Arc' }, { id: 'ellipse', label: 'Ellipse' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'door', label: 'Door' },
  { id: 'window', label: 'Window' },
  { id: 'measure', label: 'Measure' },
  { id: 'text', label: 'Text Label' },
];
const TAB_TOOLS: Record<CommandTab, ActiveTool[]> = {
  file: [],
  draw: ['polyline', 'polygon', 'square', 'circle', 'ellipse', 'triangle', 'arc'],
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
  const displayUnit = useEditorStore((state) => state.displayUnit);
  const setDisplayUnit = useEditorStore((state) => state.setDisplayUnit);
  const snapStatus = useEditorStore((state) => state.snapStatus);
  const placedFurnitureKind = useEditorStore((state) => state.placedFurnitureKind);
  const placedDoorType = useEditorStore((state) => state.placedDoorType);
  const [furnitureCategory, setFurnitureCategory] = useState<FurnitureCategory>('furniture');
  const [searchQueries, setSearchQueries] = useState({ furniture: '', draw: '' });
  const searchTab = activeTab === 'furniture' ? 'furniture' : 'draw';
  const query = searchQueries[searchTab].trim().toLowerCase();

  const tools = TOOLS.filter((tool) => TAB_TOOLS[activeTab].includes(tool.id));
  const filteredTools = tools.filter((tool) => tool.label.toLowerCase().includes(query));
  const categoryFurnitureKinds = FURNITURE_KINDS.filter(
    (kind) => FURNITURE_DEFINITIONS[kind].category === furnitureCategory
      && FURNITURE_DEFINITIONS[kind].label.toLowerCase().includes(query),
  );

  return <aside className="sidebar" aria-label="Component library and properties">
    <h1>{drawing.name || "Karma's apartment draft"}</h1>
    <p className="muted">Actual measurements in inches · drawing scale 1:25</p>
    {error && <div role="alert" className="error">{error}<button type="button" className="btn-secondary" onClick={() => useEditorStore.getState().reportError(null)}>Dismiss</button></div>}
    {warning && <div role="alert" className="error"><p>{warning}</p>
      <button type="button" className="btn-warning" onClick={() => useDrawingStore.getState().enableRecovery()}>Resume recovery — replace saved copy</button></div>}
    {(tools.length > 0 || activeTab === 'view' || activeTab === 'furniture' || activeTab === 'walls') && <section aria-label="Component Library">
      {(activeTab === 'furniture' || activeTab === 'draw') && <label>
        {activeTab === 'furniture' ? 'Search furniture & equipment' : 'Search shapes'}
        <input
          type="search"
          value={searchQueries[searchTab]}
          placeholder={activeTab === 'furniture' ? 'Search this category...' : 'Search shapes...'}
          onChange={(event) => setSearchQueries(previous => ({ ...previous, [searchTab]: event.target.value }))}
        />
      </label>}
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
                  title={def.label}
                  aria-label={def.label}
                  onClick={() => useEditorStore.getState().setPlacedFurnitureKind(kind)}
                >
                  <FurnitureIcon kind={kind} size={28} />
                </button>
              );
            })}
          </div>
          {categoryFurnitureKinds.length === 0 && <p className="muted" role="status">No items found</p>}
        </>
      ) : activeTab === 'walls' ? (
        <>
          <h2>Building Envelope</h2>
          <div className="library-grid">
            <button
              type="button"
              className="library-tile-btn"
              aria-pressed={activeTool === 'door'}
              title="Door"
              aria-label="Door"
              onClick={() => {
                useEditorStore.getState().setTool('door');
                useEditorStore.getState().setPlacedDoorType('single_door');
              }}
            >
              <DoorIcon size={34} />
            </button>

            <button
              type="button"
              className="library-tile-btn"
              aria-pressed={activeTool === 'window'}
              title="Window"
              aria-label="Window"
              onClick={() => {
                useEditorStore.getState().setTool('window');
                useEditorStore.getState().setPlacedWindowType('standard_window');
              }}
            >
              <WindowIcon size={34} />
            </button>

            <button
              type="button"
              className="library-tile-btn"
              aria-pressed={activeTool === 'door' && placedDoorType === 'single_door'}
              title="Opening"
              aria-label="Opening"
              onClick={() => {
                useEditorStore.getState().setTool('door');
                useEditorStore.getState().setPlacedDoorType('single_door');
              }}
            >
              <OpeningIcon size={34} />
            </button>
          </div>
        </>
      ) : activeTab === 'annotate' ? (
        <>
          <h2>Annotations</h2>
          <div className="library-grid">
            <button
              type="button"
              className="library-tile-btn"
              aria-pressed={activeTool === 'text'}
              title="Text Label"
              aria-label="Text Label"
              onClick={() => useEditorStore.getState().setTool('text')}
              style={{ flexDirection: 'column', gap: '6px' }}
            >
              <ToolIcon tool="text" size={28} />
              <span className="library-tile-label">Text Label</span>
            </button>
            <button
              type="button"
              className="library-tile-btn"
              aria-pressed={activeTool === 'measure'}
              title="Measure"
              aria-label="Measure"
              onClick={() => useEditorStore.getState().setTool('measure')}
              style={{ flexDirection: 'column', gap: '6px' }}
            >
              <ToolIcon tool="measure" size={28} />
              <span className="library-tile-label">Measure</span>
            </button>
          </div>
        </>
      ) : tools.length > 0 ? (
        <>
          <h2>{activeTab === 'draw' ? 'Drawing Tools' : 'Tools'}</h2>
          <div className="library-grid">{filteredTools.map((tool) =>
            <button
              key={tool.id}
              type="button"
              className="library-tile-btn"
              aria-pressed={activeTool === tool.id}
              title={tool.label}
              aria-label={tool.label}
              onClick={() => useEditorStore.getState().setTool(tool.id)}
            >
              <ToolIcon tool={tool.id} size={28} />
            </button>,
          )}</div>
          {filteredTools.length === 0 && <p className="muted" role="status">No items found</p>}
        </>
      ) : null}
      <div className="button-row">
        <button type="button" className="btn-secondary" disabled={!canUndo} onClick={() => useDrawingStore.getState().undo()}>Undo</button>
        <button type="button" className="btn-secondary" disabled={!canRedo} onClick={() => useDrawingStore.getState().redo()}>Redo</button>
        <button type="button" className="btn-secondary" onClick={() => useEditorStore.getState().resetView()}>Reset view</button>
      </div>

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
        Unit: 
        <select value={displayUnit} onChange={(e) => setDisplayUnit(e.target.value as typeof displayUnit)}>
          <option value="inches">Inches</option>
          <option value="feet">Feet</option>
          <option value="meters">Meters</option>
          <option value="millimeters">Millimeters</option>
        </select>
      </label>
      <p>Zoom: {Math.round(scale / BASE_PIXELS_PER_MM * 100)}%</p>
      <p className="snap-status" role="status">Snapping: {snapStatus ?? 'Grid and object anchors'}. Hold Alt for free placement.</p>
    </section>}
    {activeTab === 'file' && <FileControls />}
    {activeTab === 'view' && <DocumentSettings key={`${drawing.name}:${drawing.gridMm}`} document={drawing} />}
    <p role="status">{warning ? 'Automatic recovery paused' : recoveryStatus}</p>
    <small>Local-only drawing. Browser storage and downloaded files are not encrypted by this app. Use your own trusted computer.</small>
    <div className="button-row" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
      <button type="button" className="btn-secondary" style={{ color: '#dc2626', borderColor: '#fca5a5', width: '100%' }} onClick={() => {
        if (window.confirm("Are you sure you want to clear the entire canvas?")) {
          useDrawingStore.getState().clearCanvas();
        }
      }}>Clear Canvas</button>
    </div>
  </aside>;
}
