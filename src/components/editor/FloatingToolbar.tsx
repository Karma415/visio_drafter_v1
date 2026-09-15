import { useEditorStore } from '../../store/useEditorStore';

/**
 * Sleek floating drawing toolbar positioned at top-center of the canvas.
 * Contains the core active drawing tools: Select, Wall, and Room.
 */
export function FloatingToolbar() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setTool = useEditorStore((state) => state.setTool);

  return (
    <div className="floating-toolbar" role="toolbar" aria-label="Drawing tools">
      <button
        type="button"
        className="floating-toolbar-btn"
        aria-pressed={activeTool === 'select'}
        title="Select & Pan (V)"
        onClick={() => setTool('select')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 3 7 18 3-7 7-3L3 3z" />
          <path d="m13 13 6 6" />
        </svg>
        <span>Select</span>
      </button>

      <button
        type="button"
        className="floating-toolbar-btn"
        aria-pressed={activeTool === 'wall'}
        title="Wall (Line tool)"
        onClick={() => setTool('wall')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="4" y1="20" x2="20" y2="4" />
          <circle cx="4" cy="20" r="1.5" fill="currentColor" />
          <circle cx="20" cy="4" r="1.5" fill="currentColor" />
        </svg>
        <span>Wall</span>
      </button>

      <button
        type="button"
        className="floating-toolbar-btn"
        aria-pressed={activeTool === 'rectangle'}
        title="Room (Rectangle tool)"
        onClick={() => setTool('rectangle')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
        <span>Room</span>
      </button>
    </div>
  );
}
