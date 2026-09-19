import { useRef, useState } from 'react';
import { saveProject, loadProjectFile, exportImage } from '../../services/projectFiles';
import { useEditorStore } from '../../store/useEditorStore';

export function FileControls() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLoading(true);
    try {
      await loadProjectFile(file);
    } catch (err) {
      useEditorStore.getState().reportError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Project and file management">
      <h2>Project Files</h2>
      <div className="button-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={saveProject}
          style={{ width: '100%' }}
        >
          Save Project
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
          style={{ width: '100%' }}
        >
          {loading ? 'Reading…' : 'Load Project'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={exportImage}
          style={{ width: '100%' }}
        >
          Export Image
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={handleFileChange}
      />

      <div style={{ marginTop: '1rem', fontSize: '12px', color: 'var(--cad-text-muted)' }}>
        <p style={{ margin: '4px 0' }}>• <strong>Save Project</strong>: Downloads full canvas state as <code>floorplan.json</code>.</p>
        <p style={{ margin: '4px 0' }}>• <strong>Load Project</strong>: Replaces canvas state from a selected <code>.json</code> project file.</p>
        <p style={{ margin: '4px 0' }}>• <strong>Export Image</strong>: Renders canvas stage to <code>floorplan.png</code>.</p>
      </div>
    </section>
  );
}
