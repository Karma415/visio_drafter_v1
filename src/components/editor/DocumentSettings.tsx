import { useState } from 'react';
import type { DrawingDocument } from '../../domain/document';
import { inchesToMm, mmToInches, parseInches, formatMetric, formatNumber } from '../../domain/units';
import { visibleGridStep } from '../../domain/geometry';
import { useDrawingStore } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';

export function DocumentSettings({ document }: { document: DrawingDocument }) {
  const [name, setName] = useState(document.name);
  const [grid, setGrid] = useState(String(Number(mmToInches(document.gridMm).toFixed(8))));
  const [error, setError] = useState('');
  const scale = useEditorStore((state) => state.scale);
  return <section>
    <h2>Drawing setup</h2>
    <form onSubmit={(event) => {
      event.preventDefault();
      try {
        useDrawingStore.getState().updateSettings({ name: name.trim() || 'My apartment', gridMm: inchesToMm(parseInches(grid)) });
        setError('');
      } catch (problem) { setError(problem instanceof Error ? problem.message : 'Invalid settings.'); }
    }}>
      <label>Drawing name<input maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Snap spacing — actual inches<input value={grid} onChange={(event) => setGrid(event.target.value)} /></label>
      <small>Example: 1 or 1/8. Smaller grid lines are hidden at distant zoom levels.</small>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit">Apply setup</button>
    </form>
    <label>Metric readouts<select value={document.displayUnit} onChange={(event) => {
      const unit = event.target.value;
      if (unit === 'mm' || unit === 'cm') useDrawingStore.getState().updateSettings({ displayUnit: unit });
    }}><option value="mm">Millimeters</option><option value="cm">Centimeters</option></select></label>
    <p>Scale: <strong>1:25</strong><br />
      Snap: {formatNumber(mmToInches(document.gridMm))} in<br />
      Visible grid: {formatMetric(visibleGridStep(document.gridMm, scale), document.displayUnit)} actual</p>
    <small>Zoom affects your view only. Screen size is not calibrated to a physical ruler.</small>
  </section>;
}
