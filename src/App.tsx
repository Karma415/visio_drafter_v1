import { useState } from 'react';
import { DrawingCanvas } from './components/canvas/DrawingCanvas';
import { CommandBar } from './components/editor/CommandBar';
import { InspectorPanel } from './components/editor/InspectorPanel';
import { Sidebar } from './components/editor/Sidebar';
import type { CommandTab } from './components/editor/navigation';
import { TextEditor } from './components/editor/TextEditor';
import { useEditorKeyboard } from './hooks/useEditorKeyboard';
import { useLocalRecovery } from './hooks/useLocalRecovery';
import { useDrawingStore } from './store/useDrawingStore';
import { useEditorStore } from './store/useEditorStore';
import './App.css';

export default function App() {
  const recoveryStatus = useLocalRecovery();
  useEditorKeyboard();
  const [activeTab, setActiveTab] = useState<CommandTab>('draw');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const shapes = useDrawingStore((state) => state.document.shapes);
  const editingId = useEditorStore((state) => state.editingId);
  const editingShape = shapes.find((shape) => shape.id === editingId && shape.type === 'text');

  return <main className="drafting-app">
    <CommandBar activeTab={activeTab} leftOpen={leftOpen} rightOpen={rightOpen}
      onTabChange={setActiveTab} onToggleLeft={() => setLeftOpen((open) => !open)} onToggleRight={() => setRightOpen((open) => !open)} />
    <div className="drafting-workspace">
      {leftOpen && <Sidebar recoveryStatus={recoveryStatus} activeTab={activeTab} />}
      <DrawingCanvas />
      {rightOpen && <InspectorPanel />}
    </div>
    {editingShape && <TextEditor key={editingShape.id} shape={editingShape} />}
  </main>;
}
