import { useRef } from 'react';
import { COMMAND_TABS, type CommandTab } from './navigation';
import { saveProject, loadProjectFile, exportImage } from '../../services/projectFiles';
import { useEditorStore } from '../../store/useEditorStore';

interface Props {
  activeTab: CommandTab;
  leftOpen: boolean;
  rightOpen: boolean;
  onTabChange: (tab: CommandTab) => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

/** Global navigation and quick file action toolbar. */
export function CommandBar({ activeTab, leftOpen, rightOpen, onTabChange, onToggleLeft, onToggleRight }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await loadProjectFile(file);
    } catch (err) {
      useEditorStore.getState().reportError(err);
    }
  }

  return (
    <header className="command-bar">
      <div className="command-bar__brand">
        <span className="command-bar__logo">K</span> <span>1:25</span>
      </div>
      <nav className="command-tabs" aria-label="Drafting commands" role="tablist">
        {COMMAND_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className="command-tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="command-bar__actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', marginRight: '12px' }}>
        <button
          type="button"
          className="command-panel-toggle"
          title="Save Project (floorplan.json)"
          onClick={saveProject}
        >
          Save Project
        </button>
        <button
          type="button"
          className="command-panel-toggle"
          title="Load Project (.json)"
          onClick={() => fileInputRef.current?.click()}
        >
          Load Project
        </button>
        <button
          type="button"
          className="command-panel-toggle"
          title="Export Image (floorplan.png)"
          onClick={exportImage}
        >
          Export Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={handleFileChange}
        />
      </div>
      <div className="command-bar__panels" aria-label="Workspace panels">
        <button type="button" className="command-panel-toggle" aria-pressed={leftOpen} onClick={onToggleLeft}>Tools</button>
        <button type="button" className="command-panel-toggle" aria-pressed={rightOpen} onClick={onToggleRight}>Inspector</button>
      </div>
    </header>
  );
}
