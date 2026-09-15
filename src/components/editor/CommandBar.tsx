import { COMMAND_TABS, type CommandTab } from './navigation';

interface Props {
  activeTab: CommandTab;
  leftOpen: boolean;
  rightOpen: boolean;
  onTabChange: (tab: CommandTab) => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

/** Global navigation only. Individual command content remains in the side panels. */
export function CommandBar({ activeTab, leftOpen, rightOpen, onTabChange, onToggleLeft, onToggleRight }: Props) {
  return <header className="command-bar">
    <div className="command-bar__brand"><span className="command-bar__logo">K</span> <span>1:25</span></div>
    <nav className="command-tabs" aria-label="Drafting commands" role="tablist">
      {COMMAND_TABS.map((tab) => <button key={tab.id} type="button" role="tab" className="command-tab"
        aria-selected={activeTab === tab.id} onClick={() => onTabChange(tab.id)}>{tab.label}</button>)}
    </nav>
    <div className="command-bar__panels" aria-label="Workspace panels">
      <button type="button" className="command-panel-toggle" aria-pressed={leftOpen} onClick={onToggleLeft}>Tools</button>
      <button type="button" className="command-panel-toggle" aria-pressed={rightOpen} onClick={onToggleRight}>Inspector</button>
    </div>
  </header>;
}
