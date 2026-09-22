import { useState } from 'react';
import { DrawingCanvas } from './components/canvas/DrawingCanvas';
import { CommandBar } from './components/editor/CommandBar';
import { FloatingToolbar } from './components/editor/FloatingToolbar';
import { InspectorPanel } from './components/editor/InspectorPanel';
import { Sidebar } from './components/editor/Sidebar';
import type { CommandTab } from './components/editor/navigation';
import { TextEditor } from './components/editor/TextEditor';
import { useEditorKeyboard } from './hooks/useEditorKeyboard';
import { useLocalRecovery } from './hooks/useLocalRecovery';
import { useDrawingStore, getActivePage } from './store/useDrawingStore';
import { useEditorStore } from './store/useEditorStore';
import './App.css';

function PageTabBar() {
  const document = useDrawingStore((state) => state.document);
  const addPage = useDrawingStore((state) => state.addPage);
  const removePage = useDrawingStore((state) => state.removePage);
  const renamePage = useDrawingStore((state) => state.renamePage);
  const activePageId = useEditorStore((state) => state.activePageId) || document.pages[0]?.id;
  const setActivePageId = useEditorStore((state) => state.setActivePageId);

  return (
    <div className="page-tab-bar" style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', padding: '4px 8px 0', gap: '4px' }}>
      {document.pages.map((page) => (
        <div key={page.id} style={{ display: 'flex', alignItems: 'center', background: activePageId === page.id ? '#ffffff' : '#f1f5f9', border: '1px solid #cbd5e1', borderBottom: activePageId === page.id ? '1px solid #ffffff' : '1px solid #cbd5e1', marginBottom: activePageId === page.id ? '-1px' : '0', borderRadius: '4px 4px 0 0', padding: '4px 8px', cursor: 'pointer' }}>
          <input
            type="text"
            value={page.name}
            onChange={(e) => renamePage(page.id, e.target.value)}
            onFocus={() => setActivePageId(page.id)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: Math.max(50, page.name.length * 8) + 'px', fontWeight: activePageId === page.id ? '600' : 'normal', color: '#334155' }}
          />
          {document.pages.length > 1 && (
            <button type="button" onClick={(e) => { e.stopPropagation(); removePage(page.id); }} title="Delete page" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginLeft: '4px', fontSize: '14px' }}>×</button>
          )}
        </div>
      ))}
      <button type="button" onClick={addPage} title="Add page" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#64748b', fontWeight: 'bold' }}>+</button>
    </div>
  );
}

export default function App() {
  const recoveryStatus = useLocalRecovery();
  useEditorKeyboard();
  const [activeTab, setActiveTab] = useState<CommandTab>('draw');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const shapes = useDrawingStore((state) => getActivePage(state.document).shapes);
  const editingId = useEditorStore((state) => state.editingId);
  const editingShape = shapes.find((shape) => shape.id === editingId && shape.type === 'text');

  return <main className="drafting-app">
    <CommandBar activeTab={activeTab} leftOpen={leftOpen} rightOpen={rightOpen}
      onTabChange={setActiveTab} onToggleLeft={() => setLeftOpen((open) => !open)} onToggleRight={() => setRightOpen((open) => !open)} />
    <div className="drafting-workspace">
      {leftOpen && <Sidebar recoveryStatus={recoveryStatus} activeTab={activeTab} />}
      <div className="canvas-container" style={{ display: 'flex', flexDirection: 'column' }}>
        <PageTabBar />
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <FloatingToolbar />
          <DrawingCanvas />
        </div>
      </div>
      {rightOpen && <InspectorPanel />}
    </div>
    {editingShape && <TextEditor key={editingShape.id} shape={editingShape} />}
  </main>;
}
