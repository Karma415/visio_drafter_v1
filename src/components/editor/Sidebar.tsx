import { useState } from 'react';
import { useDrawingStore, getActivePage } from '../../store/useDrawingStore';
import { BASE_PIXELS_PER_MM, useEditorStore } from '../../store/useEditorStore';
import type { ActiveTool } from '../../store/useEditorStore';
import { DocumentSettings } from './DocumentSettings';
import { FileControls } from './FileControls';
import type { CommandTab } from './navigation';
import type { FurnitureCategory } from '../../domain/furniture';
import { FURNITURE_CATEGORIES, FURNITURE_DEFINITIONS, FURNITURE_KINDS } from '../../domain/furniture';
import { ToolIcon } from './ToolIcons';
import { DoorIcon, WindowIcon, OpeningIcon } from './ComponentIcons';
import { DOOR_DEFINITIONS } from '../../domain/doors';
import { FurnitureIcon } from './FurnitureIcons';

const TOOLS: { id: ActiveTool; label: string }[] = [
  { id: 'polyline', label: 'Connected line' }, { id: 'polygon', label: 'Polygon' },
  { id: 'square', label: 'Square' }, { id: 'circle', label: 'Circle' }, { id: 'triangle', label: 'Triangle' },
  { id: 'arc', label: 'Arc' }, { id: 'ellipse', label: 'Ellipse' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'door', label: 'Door' },
  { id: 'window', label: 'Window' },
  { id: 'measure', label: 'Dimension' },
  { id: 'eraser', label: 'Eraser' },
  { id: 'lasso', label: 'Lasso / Crop' },
  { id: 'text', label: 'Text Label' },
  { id: 'callout', label: 'Callout Box' },
  { id: 'chart', label: 'Chart Widget' },
  { id: 'spreadsheet', label: 'Spreadsheet' },
];
const TAB_TOOLS: Record<CommandTab, ActiveTool[]> = {
  file: [],
  draw: ['polyline', 'polygon', 'square', 'circle', 'ellipse', 'triangle', 'arc', 'eraser', 'lasso'],
  walls: ['door', 'window'],
  annotate: ['measure', 'text', 'callout', 'spreadsheet', 'chart'],
  edit: ['eraser', 'lasso'],
  furniture: ['furniture'],
  view: [],
  inventory: [],
};
function LayerPanel() {
  const drawing = useDrawingStore((state) => state.document);
  const addLayer = useDrawingStore((state) => state.addLayer);
  const updateLayer = useDrawingStore((state) => state.updateLayer);
  const removeLayer = useDrawingStore((state) => state.removeLayer);
  const moveLayer = useDrawingStore((state) => state.moveLayer);
  
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const setActiveLayerId = useEditorStore((state) => state.setActiveLayerId);

  return (
    <section aria-label="Layers" className="layers-panel" style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
      <h2>Layers</h2>
      <div className="layers-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {drawing.layers.map((layer, index) => (
          <div key={layer.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: activeLayerId === layer.id ? '#e0f2fe' : '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
            <input type="radio" name="activeLayer" checked={activeLayerId === layer.id || (!activeLayerId && index === 0)} onChange={() => setActiveLayerId(layer.id)} title="Set as active layer" style={{ flexShrink: 0 }} />
            <input type="text" value={layer.name} onChange={(e) => updateLayer(layer.id, { name: e.target.value })} style={{ flex: '1 1 0%', minWidth: 0, padding: '4px 6px', border: '1px solid transparent', background: 'transparent', outline: 'none', color: '#0f172a' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
              <button type="button" onClick={() => updateLayer(layer.id, { isVisible: !layer.isVisible })} title={layer.isVisible ? 'Hide layer' : 'Show layer'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {layer.isVisible ? '👁️' : '🕶️'}
              </button>
              <button type="button" onClick={() => updateLayer(layer.id, { isLocked: !layer.isLocked })} title={layer.isLocked ? 'Unlock layer' : 'Lock layer'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {layer.isLocked ? '🔒' : '🔓'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 2px' }}>
                <button type="button" disabled={index === 0} onClick={() => moveLayer(layer.id, 'up')} style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', fontSize: '10px', padding: '2px', opacity: index === 0 ? 0.3 : 1 }}>▲</button>
                <button type="button" disabled={index === drawing.layers.length - 1} onClick={() => moveLayer(layer.id, 'down')} style={{ background: 'none', border: 'none', cursor: index === drawing.layers.length - 1 ? 'default' : 'pointer', fontSize: '10px', padding: '2px', opacity: index === drawing.layers.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>
              <button type="button" disabled={drawing.layers.length <= 1} onClick={() => removeLayer(layer.id)} title="Delete layer" style={{ background: 'none', border: 'none', cursor: drawing.layers.length <= 1 ? 'default' : 'pointer', color: '#dc2626', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: drawing.layers.length <= 1 ? 0.3 : 1 }}>
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn-secondary" onClick={addLayer} style={{ width: '100%' }}>Add Layer</button>
    </section>
  );
}

export function Sidebar({ recoveryStatus, activeTab }: { recoveryStatus: string; activeTab: CommandTab }) {
  const drawing = useDrawingStore((state) => state.document);
  const canUndo = useDrawingStore((state) => state.past.length > 0);
  const canRedo = useDrawingStore((state) => state.future.length > 0);
  const warning = useDrawingStore((state) => state.recoveryWarning);
  const activeTool = useEditorStore((state) => state.activeTool);
  const scale = useEditorStore((state) => state.scale);
  const error = useEditorStore((state) => state.error);
  const measurementUnit = useEditorStore((state) => state.measurementUnit);
  const setMeasurementUnit = useEditorStore((state) => state.setMeasurementUnit);
  const snapStatus = useEditorStore((state) => state.snapStatus);
  const placedFurnitureKind = useEditorStore((state) => state.placedFurnitureKind);
  const placedDoorType = useEditorStore((state) => state.placedDoorType);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ 'Living Room': true });
  const [searchQueries, setSearchQueries] = useState({ furniture: '', draw: '' });
  const searchTab = activeTab === 'furniture' ? 'furniture' : 'draw';
  const query = searchQueries[searchTab].trim().toLowerCase();

  const tools = TOOLS.filter((tool) => TAB_TOOLS[activeTab].includes(tool.id));
  const filteredTools = tools.filter((tool) => tool.label.toLowerCase().includes(query));
  const FOLDERS = [
    { name: 'Living Room', items: ['sofa', 'loveseat', 'sectional_sofa', 'armchair', 'coffee_table', 'end_table', 'tv_unit', 'console_table', 'piano'] },
    { name: 'Bedroom', items: ['bed', 'queen_bed', 'king_bed', 'twin_bed', 'bunk_bed', 'nightstand', 'wardrobe', 'dresser'] },
    { name: 'Kitchen & Dining', items: ['dining_table_round', 'dining_table_rectangular', 'kitchen_island', 'bar_stool', 'floor_cabinet', 'wall_cabinet', 'tall_cabinet', 'refrigerator', 'stove', 'dishwasher', 'countertop_dishwasher', 'kitchen_sink'] },
    { name: 'Bathroom', items: ['bathroom_vanity', 'double_vanity', 'toilet', 'bathtub', 'freestanding_tub', 'shower', 'bidet'] },
    { name: 'Office', items: ['desk', 'l_desk', 'office_desk', 'desk_chair', 'bookshelf', 'filing_cabinet', 'conference_table'] },
    { name: 'Utility & Misc', items: ['washer_dryer', 'water_heater', 'furnace', 'table', 'chair', 'pool_table', 'treadmill', 'wall_shelf'] }
  ];

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }));
  };



  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;
      
      const img = new Image();
      img.onload = () => {
        const activeLayerId = useEditorStore.getState().activeLayerId || getActivePage(drawing).layers[0].id;
        
        // Scale down if extremely large
        let w = img.width;
        let h = img.height;
        const maxDimension = 2000;
        if (w > maxDimension || h > maxDimension) {
          const ratio = Math.min(maxDimension / w, maxDimension / h);
          w *= ratio;
          h *= ratio;
        }

        useDrawingStore.getState().addShape({
          type: 'image',
          x: 0,
          y: 0,
          width: w,
          height: h,
          imageUrl: dataUrl,
          layerId: activeLayerId,
          fill: 'transparent'
        });
        
        const added = getActivePage(useDrawingStore.getState().document).shapes.at(-1);
        if (added) {
          useEditorStore.getState().setTool('select');
          useEditorStore.getState().select(added.id);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };
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
          
          <div style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px dashed var(--cad-border)', borderRadius: '4px', textAlign: 'center' }}>
            <label style={{ cursor: 'pointer', display: 'block', padding: '0.5rem', fontWeight: 'bold' }}>
              + Upload Custom Image/SVG
              <input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleImageUpload} style={{ display: 'none' }} />
            </label>
          </div>
          <div className="accordion-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {FOLDERS.map((folder) => {
              const filteredItems = folder.items.filter((kind) => {
                const def = FURNITURE_DEFINITIONS[kind as any];
                if (!def) return false;
                return !query || def.label.toLowerCase().includes(query) || kind.toLowerCase().includes(query);
              });
              
              if (filteredItems.length === 0) return null;
              
              const isExpanded = query ? true : expandedFolders[folder.name];
              
              return (
                <div key={folder.name} className="accordion-folder" style={{ border: '1px solid var(--cad-border)', borderRadius: '4px', overflow: 'hidden' }}>
                  <button 
                    type="button" 
                    onClick={() => toggleFolder(folder.name)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--cad-surface)', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'var(--cad-text-primary)' }}
                  >
                    <span>{folder.name} ({filteredItems.length})</span>
                    <span>{isExpanded ? '▼' : '▶'}</span>
                  </button>
                  {isExpanded && (
                    <div className="library-grid" style={{ padding: '0.5rem', background: 'var(--cad-bg)' }}>
                      {filteredItems.map((kind) => {
                        const def = FURNITURE_DEFINITIONS[kind as any];
                        const isSelected = activeTool === 'furniture' && placedFurnitureKind === kind;
                        return (
                          <button
                            key={kind}
                            type="button"
                            className="library-tile-btn"
                            aria-pressed={isSelected}
                            title={def.label}
                            aria-label={def.label}
                            onClick={() => useEditorStore.getState().setPlacedFurnitureKind(kind as any)}
                          >
                            <FurnitureIcon kind={kind as any} size={28} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {FOLDERS.every(f => f.items.filter(k => !query || (FURNITURE_DEFINITIONS[k as any] && FURNITURE_DEFINITIONS[k as any].label.toLowerCase().includes(query))).length === 0) && <p className="muted" role="status">No items found</p>}
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
              aria-pressed={activeTool === 'callout'}
              title="Callout Box"
              aria-label="Callout Box"
              onClick={() => useEditorStore.getState().setTool('callout')}
              style={{ flexDirection: 'column', gap: '6px' }}
            >
              <ToolIcon tool="text" size={28} />
              <span className="library-tile-label">Callout</span>
            </button>
            <button
              type="button"
              className="library-tile-btn"
              aria-pressed={activeTool === 'chart'}
              title="Chart Widget"
              aria-label="Chart Widget"
              onClick={() => useEditorStore.getState().setTool('chart')}
              style={{ flexDirection: 'column', gap: '6px' }}
            >
              <ToolIcon tool="polygon" size={28} />
              <span className="library-tile-label">Chart</span>
            </button>
            <button
              type="button"
              className="library-tile-btn"
              aria-pressed={activeTool === 'measure'}
              title="Dimension"
              aria-label="Dimension"
              onClick={() => useEditorStore.getState().setTool('measure')}
              style={{ flexDirection: 'column', gap: '6px' }}
            >
              <ToolIcon tool="measure" size={28} />
              <span className="library-tile-label">Dimension</span>
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
      
      {activeTool === 'eraser' && (
        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem', background: '#fee2e2', padding: '0.5rem', borderRadius: '4px' }}>
          Eraser Size:
          <input type="range" min="5" max="100" step="1" value={useEditorStore(state => state.eraserSize)} onChange={(e) => useEditorStore.getState().setEraserSize(Number(e.target.value))} />
        </label>
      )}
      <div className="button-row">
        <button type="button" className="btn-secondary" disabled={!canUndo} onClick={() => useDrawingStore.getState().undo()}>Undo</button>
        <button type="button" className="btn-secondary" disabled={!canRedo} onClick={() => useDrawingStore.getState().redo()}>Redo</button>
        <button type="button" className="btn-secondary" onClick={() => useEditorStore.getState().resetView()}>Reset view</button>
      </div>

      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' }}>
        Unit: 
        <select value={measurementUnit} onChange={(e) => setMeasurementUnit(e.target.value as typeof measurementUnit)}>
          <option value="in">Inches (in)</option>
          <option value="ft">Feet (ft)</option>
          <option value="m">Meters (m)</option>
          <option value="cm">Centimeters (cm)</option>
          <option value="mm">Millimeters (mm)</option>
        </select>
      </label>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
        Drawing Scale (1px = X units): 
        <input type="number" step="0.1" min="0.1" value={useEditorStore((state) => state.drawingScale)} onChange={(e) => useEditorStore.getState().setDrawingScale(parseFloat(e.target.value) || 1)} style={{ width: '80px' }} />
      </label>
      <p>Zoom: {Math.round(scale / BASE_PIXELS_PER_MM * 100)}%</p>
      <p className="snap-status" role="status">Snapping: {snapStatus ?? 'Grid and object anchors'}. Hold Alt for free placement.</p>
    </section>}
    {activeTab === 'file' && <FileControls />}

    {activeTab === 'inventory' && (
      <section aria-label="Inventory" style={{ marginTop: '1rem' }}>
        <h2>Bill of Materials</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '1rem', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--cad-border)' }}>
              <th style={{ padding: '0.5rem 0' }}>Item Description</th>
              <th style={{ padding: '0.5rem 0', width: '40px' }}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const activePage = getActivePage(drawing);
              const counts: Record<string, number> = {};
              
              const processShape = (shape: any) => {
                if (shape.type === 'furniture' && shape.furnitureKind) {
                  const label = FURNITURE_DEFINITIONS[shape.furnitureKind as keyof typeof FURNITURE_DEFINITIONS]?.label || shape.furnitureKind;
                  counts[label] = (counts[label] || 0) + 1;
                } else if (shape.type === 'door' && shape.doorType) {
                  const label = DOOR_DEFINITIONS[shape.doorType as keyof typeof DOOR_DEFINITIONS]?.label || shape.doorType;
                  counts[label] = (counts[label] || 0) + 1;
                } else if (shape.type === 'window' && shape.windowType) {
                  const label = 'Window: ' + shape.windowType;
                  counts[label] = (counts[label] || 0) + 1;
                } else if (shape.type === 'group' && shape.groupChildren) {
                  shape.groupChildren.forEach(processShape);
                }
              };
              
              activePage.shapes.forEach(processShape);
              
              const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
              if (rows.length === 0) return <tr><td colSpan={2} className="muted" style={{ padding: '1rem 0', textAlign: 'center' }}>No billable items found on canvas.</td></tr>;
              
              return rows.map(([label, count]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--cad-border)' }}>
                  <td style={{ padding: '0.5rem 0' }}>{label}</td>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>{count}</td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </section>
    )}

    {activeTab === 'view' && (
      <>
        <DocumentSettings key={`${drawing.name}:${drawing.gridMm}`} document={drawing} />
        <LayerPanel />
      </>
    )}
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
