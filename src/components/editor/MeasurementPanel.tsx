import { useState } from 'react';
import { circleWithRadius } from '../../domain/manipulation';
import type { Shape } from '../../domain/document';
import { formatMetric, paperMm } from '../../domain/units';
import { parseInputToMm, formatMmToUnit } from '../../utils/units';
import { useDrawingStore, getActivePage } from '../../store/useDrawingStore';
import { WALL_DEFINITIONS, WALL_TYPES } from '../../domain/walls';
import { useEditorStore } from '../../store/useEditorStore';
import { wallLength as getWallLength } from '../../domain/geometry';
import { DEFAULT_FURNITURE_KIND, FURNITURE_CATEGORIES, FURNITURE_DEFINITIONS, FURNITURE_KINDS } from '../../domain/furniture';
import type { DoorType, WindowType } from '../../domain/doors';
import { DEFAULT_DOOR_TYPE, DEFAULT_WINDOW_TYPE, DOOR_TYPES, OPENING_DEFINITIONS, WINDOW_TYPES } from '../../domain/doors';

interface Props { shape: Shape; selectedIds?: string[]; unit: 'mm' | 'cm' }
export function MeasurementPanel({ shape, selectedIds = [], unit }: Props) {
  const measurementUnit = useEditorStore((state) => state.measurementUnit);
  const drawingScale = useEditorStore((state) => state.drawingScale);
  const [width, setWidth] = useState(formatMmToUnit(shape.width, measurementUnit, drawingScale));
  const [height, setHeight] = useState(formatMmToUnit(shape.height, measurementUnit, drawingScale));
  const [radius, setRadius] = useState(formatMmToUnit(shape.width / 2, measurementUnit, drawingScale));
  const [x, setX] = useState(formatMmToUnit(shape.x, measurementUnit, drawingScale));
  const [y, setY] = useState(formatMmToUnit(shape.y, measurementUnit, drawingScale));
  const [rotation, setRotation] = useState(() => {
    if (shape.type === 'wall' && shape.points && shape.points.length >= 4) {
      let angle = Math.atan2(shape.points[3] - shape.points[1], shape.points[2] - shape.points[0]) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      return String(Math.round(angle * 10) / 10);
    }
    return String(shape.rotation ?? 0);
  });
  const [startAngle, setStartAngle] = useState(String(shape.startAngle ?? 0));
  const [endAngle, setEndAngle] = useState(String(shape.endAngle ?? 180));
  const [wallType, setWallType] = useState(shape.wallType ?? 'interior_partition');
  const [wallThickness, setWallThickness] = useState(formatMmToUnit(shape.wallThicknessMm ?? 101.6, measurementUnit, drawingScale));
  const [wallLength, setWallLength] = useState(formatMmToUnit(getWallLength(shape), measurementUnit, drawingScale));
  const [furnitureKind, setFurnitureKind] = useState(shape.furnitureKind ?? DEFAULT_FURNITURE_KIND);
  const [doorType, setDoorType] = useState<DoorType>(shape.doorType ?? DEFAULT_DOOR_TYPE);
  const [windowType, setWindowType] = useState<WindowType>(shape.windowType ?? DEFAULT_WINDOW_TYPE);
  const [swingHinge, setSwingHinge] = useState<'left' | 'right'>(shape.swingHinge ?? 'left');
  const [swingDirection, setSwingDirection] = useState<'inside' | 'outside'>(shape.swingDirection ?? 'inside');
  const [textContent, setTextContent] = useState(shape.text ?? '');
  const [fontSize, setFontSize] = useState(String(shape.fontSize ?? 120));
  const [textColor, setTextColor] = useState(shape.fill || '#111827');
  const [fillColor, setFillColor] = useState(shape.fillColor || shape.fill || 'transparent');
  const [strokeColor, setStrokeColor] = useState(shape.strokeColor || shape.stroke || '#000000');
  const [strokeWidth, setStrokeWidth] = useState(String(shape.strokeWidth ?? 2));
  const [opacity, setOpacity] = useState(String(shape.opacity ?? 1));
  const [shadowColor, setShadowColor] = useState(shape.shadowColor || 'transparent');
  const [shadowBlur, setShadowBlur] = useState(String(shape.shadowBlur ?? 0));
  const [shadowOffsetX, setShadowOffsetX] = useState(String(shape.shadowOffsetX ?? 0));
  const [shadowOffsetY, setShadowOffsetY] = useState(String(shape.shadowOffsetY ?? 0));
  const [error, setError] = useState('');
  const isPath = shape.type === 'line' || shape.type === 'polyline' || shape.type === 'polygon' || shape.type === 'wall' || shape.type === 'measurement';
  return <section aria-labelledby="selection-title">
    <h2 id="selection-title">Selected {shape.type}</h2>
    {shape.type === 'circle' && <form onSubmit={event => {
      event.preventDefault();
      try {
        useDrawingStore.getState().replaceShapes([circleWithRadius(shape, parseInputToMm(radius, measurementUnit, NaN, drawingScale))]);
        setError('');
      } catch (problem) { setError(problem instanceof Error ? problem.message : 'Invalid radius.'); }
    }}>
      <label>Radius — actual {measurementUnit}<input value={radius} inputMode="decimal" onChange={event => setRadius(event.target.value)} /></label>
      <button type="submit" className="btn-secondary">Apply radius</button>
      <small>Sets both diameters and preserves the center.</small>
    </form>}
    <form onSubmit={(event) => {
      event.preventDefault();
      try {
        if (shape.type === 'wall') {
          const wallThicknessMm = parseInputToMm(wallThickness, measurementUnit, shape.wallThicknessMm ?? 101.6, drawingScale);
          const lengthMm = parseInputToMm(wallLength, measurementUnit, getWallLength(shape, drawingScale));
          const numericRotation = Number(rotation);
          if (!Number.isFinite(numericRotation)) throw new Error('Rotation must be a number of degrees.');
          useDrawingStore.getState().updateWallProperties(shape.id, { wallType, wallThicknessMm, lengthMm, rotation: numericRotation });
          useEditorStore.getState().setWallDefaults({ wallType, wallThicknessMm });
          setError('');
          return;
        }
        if (shape.type === 'text') {
          const numericFontSize = Number(fontSize);
          if (!Number.isFinite(numericFontSize) || numericFontSize <= 0) {
            throw new Error('Font size must be a positive number.');
          }
          const numericRotation = Number(rotation);
          if (!Number.isFinite(numericRotation)) throw new Error('Rotation must be a number of degrees.');
          const bounds = {
            x: parseInputToMm(x, measurementUnit, shape.x, drawingScale),
            y: parseInputToMm(y, measurementUnit, shape.y, drawingScale),
            width: parseInputToMm(width, measurementUnit, shape.width, drawingScale),
            height: parseInputToMm(height, measurementUnit, shape.height, drawingScale),
          };
          useDrawingStore.getState().updateGeometry(shape.id, bounds, {
            rotation: numericRotation,
            fill: textColor,
            text: textContent,
            fontSize: numericFontSize,
          });
          setError('');
          return;
        }
        const bounds = {
          x: parseInputToMm(x, measurementUnit, shape.x, drawingScale),
          y: parseInputToMm(y, measurementUnit, shape.y, drawingScale),
          width: parseInputToMm(width, measurementUnit, shape.width, drawingScale),
          height: parseInputToMm(height, measurementUnit, shape.height, drawingScale),
        };
        const numericRotation = Number(rotation);
        if (!Number.isFinite(numericRotation)) throw new Error('Rotation must be a number of degrees.');
        const properties: {
          fill?: string;
          fillColor?: string;
          strokeColor?: string;
          strokeWidth?: number;
          opacity?: number;
          shadowColor?: string;
          shadowBlur?: number;
          shadowOffsetX?: number;
          shadowOffsetY?: number;
          rotation: number;
          startAngle?: number;
          endAngle?: number;
          wallType?: typeof wallType;
          wallThicknessMm?: number;
          furnitureKind?: typeof furnitureKind;
          doorType?: DoorType;
          windowType?: WindowType;
          swingHinge?: 'left' | 'right';
          swingDirection?: 'inside' | 'outside';
        } = { rotation: numericRotation, fillColor: fillColor === 'transparent' ? undefined : fillColor, fill: fillColor === 'transparent' ? 'transparent' : fillColor, strokeColor: strokeColor === 'transparent' ? undefined : strokeColor, strokeWidth: Number(strokeWidth), opacity: Number(opacity), shadowColor: shadowColor === 'transparent' ? undefined : shadowColor, shadowBlur: Number(shadowBlur), shadowOffsetX: Number(shadowOffsetX), shadowOffsetY: Number(shadowOffsetY) };
        if (shape.type === 'furniture') {
          properties.furnitureKind = furnitureKind;
          properties.fill = FURNITURE_DEFINITIONS[furnitureKind].color;
        }
        if (shape.type === 'door') {
          properties.doorType = doorType;
          properties.swingHinge = swingHinge;
          properties.swingDirection = swingDirection;
        }
        if (shape.type === 'window') {
          properties.windowType = windowType;
        }
        if (shape.type === 'arc') {
          const start = Number(startAngle);
          const end = Number(endAngle);
          if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) {
            throw new Error('Arc angles must be different numbers of degrees.');
          }
          properties.startAngle = start;
          properties.endAngle = end;
        }
        useDrawingStore.getState().updateGeometry(shape.id, bounds, properties);
        setError('');
      } catch (problem) { setError(problem instanceof Error ? problem.message : 'Invalid dimensions.'); }
    }}>
      {shape.type !== 'wall' && <><label>X position — actual {measurementUnit}<input value={x} onChange={(event) => setX(event.target.value)} /></label>
        <label>Y position — actual {measurementUnit}<input value={y} onChange={(event) => setY(event.target.value)} /></label>
        <label>{shape.type === 'door' || shape.type === 'window' ? `Opening width — actual ${measurementUnit}` : `Width — actual ${measurementUnit}`}<input value={width} onChange={(event) => setWidth(event.target.value)} /></label>
        <label>{shape.type === 'door' || shape.type === 'window' ? `Wall / jamb thickness — actual ${measurementUnit}` : `Height — actual ${measurementUnit}`}<input value={height} onChange={(event) => setHeight(event.target.value)} /></label></>}
      {shape.type !== 'measurement' && <label>Rotation — degrees<input inputMode="decimal" value={rotation} onChange={(event) => setRotation(event.target.value)} /></label>}
      {shape.type === 'text' && (
        <>
          <label>
            Text label
            <input
              type="text"
              value={textContent}
              onChange={(event) => {
                const nextText = event.target.value;
                setTextContent(nextText);
                useDrawingStore.getState().updateText(shape.id, nextText);
              }}
              placeholder="Enter text label"
            />
          </label>
          <label>
            Font size (mm)
            <input
              type="number"
              min="10"
              max="2000"
              step="10"
              value={fontSize}
              onChange={(event) => {
                const nextSize = event.target.value;
                setFontSize(nextSize);
                const num = Number(nextSize);
                if (Number.isFinite(num) && num > 0) {
                  useDrawingStore.getState().updateTextProperties(shape.id, { fontSize: num });
                }
              }}
            />
          </label>
          <label>
            Text color
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="color"
                value={textColor.startsWith('#') && textColor.length === 7 ? textColor : '#111827'}
                onChange={(event) => {
                  const nextColor = event.target.value;
                  setTextColor(nextColor);
                  useDrawingStore.getState().updateTextProperties(shape.id, { fill: nextColor });
                }}
                style={{ width: '40px', height: '32px', padding: '2px', cursor: 'pointer', border: '1px solid var(--cad-border-subtle)', borderRadius: '4px', background: 'transparent' }}
              />
              <input
                type="text"
                value={textColor}
                onChange={(event) => {
                  const nextColor = event.target.value;
                  setTextColor(nextColor);
                  if (/^#[\da-f]{6}$/i.test(nextColor)) {
                    useDrawingStore.getState().updateTextProperties(shape.id, { fill: nextColor });
                  }
                }}
                style={{ flex: 1 }}
              />
            </div>
          </label>
        </>
      )}
      {shape.type === 'arc' && <><label>Arc start — degrees<input inputMode="decimal" value={startAngle} onChange={(event) => setStartAngle(event.target.value)} /></label>
        <label>Arc end — degrees<input inputMode="decimal" value={endAngle} onChange={(event) => setEndAngle(event.target.value)} /></label></>}
      {shape.type === 'wall' && <><label>Wall assembly<select value={wallType} onChange={(event) => {
        const nextType = event.target.value as typeof wallType;
        setWallType(nextType);
        const def = WALL_DEFINITIONS?.[nextType] || WALL_DEFINITIONS?.['interior_partition'];
        if (def) {
          const nextThickness = def.defaultThicknessMm;
          setWallThickness(formatMmToUnit(nextThickness, measurementUnit, drawingScale));
          const idsToUpdate = selectedIds.length > 0 ? selectedIds : [shape.id];
          idsToUpdate.forEach((id) => {
            const targetShape = getActivePage(useDrawingStore.getState().document).shapes.find(s => s.id === id);
            if (targetShape && targetShape.type === 'wall') {
              useDrawingStore.getState().updateWallProperties(id, { wallType: nextType, wallThicknessMm: nextThickness });
            }
          });
          useEditorStore.getState().setWallDefaults({ wallType: nextType, wallThicknessMm: nextThickness });
        }
      }}>{WALL_TYPES.map((type) => <option key={type} value={type}>{WALL_DEFINITIONS?.[type]?.label || type}</option>)}</select></label>
        <label>Wall thickness — actual {measurementUnit}<input value={wallThickness} onChange={(event) => setWallThickness(event.target.value)} /></label>
        <label>Wall length — actual {measurementUnit}<input value={wallLength} onChange={(event) => setWallLength(event.target.value)} /></label>
        {(shape.points && shape.points.length > 4) && (() => {
          const thickness = shape.wallThicknessMm ?? 101.6;
          return (
            <>
              <label>Centerline Footprint Width — actual {measurementUnit}<input value={formatMmToUnit(shape.width, measurementUnit, drawingScale)} disabled /></label>
              <label>Centerline Footprint Length — actual {measurementUnit}<input value={formatMmToUnit(shape.height, measurementUnit, drawingScale)} disabled /></label>
              <label>Exterior Footprint Width — actual {measurementUnit}<input value={formatMmToUnit(shape.width + thickness, measurementUnit, drawingScale)} disabled /></label>
              <label>Exterior Footprint Length — actual {measurementUnit}<input value={formatMmToUnit(shape.height + thickness, measurementUnit, drawingScale)} disabled /></label>
            </>
          );
        })()}
      </>}
      {shape.type === 'furniture' && <label>Furniture type<select value={furnitureKind} onChange={(event) => {
        const next = event.target.value as typeof furnitureKind;
        const definition = FURNITURE_DEFINITIONS[next];
        setFurnitureKind(next);
        setWidth(formatMmToUnit(definition.defaultWidthMm, measurementUnit, drawingScale));
        setHeight(formatMmToUnit(definition.defaultHeightMm, measurementUnit, drawingScale));
      }}>
        {FURNITURE_CATEGORIES.map((category) => (
          <optgroup key={category.id} label={category.label}>
            {FURNITURE_KINDS.filter((k) => FURNITURE_DEFINITIONS[k].category === category.id).map((kind) => (
              <option key={kind} value={kind}>{FURNITURE_DEFINITIONS[kind].label}</option>
            ))}
          </optgroup>
        ))}
      </select></label>}
      {shape.type === 'door' && <>
        <label>Door type<select value={doorType} onChange={(event) => {
          const next = event.target.value as DoorType;
          const def = OPENING_DEFINITIONS[next];
          setDoorType(next);
          setWidth(formatMmToUnit(def.defaultWidthMm, measurementUnit, drawingScale));
          setHeight(formatMmToUnit(def.defaultThicknessMm, measurementUnit, drawingScale));
        }}>
          {DOOR_TYPES.map((type) => (
            <option key={type} value={type}>{OPENING_DEFINITIONS[type].label}</option>
          ))}
        </select></label>
        <label>Hinge side<select value={swingHinge} onChange={(event) => setSwingHinge(event.target.value as 'left' | 'right')}>
          <option value="left">Left hinge</option>
          <option value="right">Right hinge</option>
        </select></label>
        <label>Swing direction<select value={swingDirection} onChange={(event) => setSwingDirection(event.target.value as 'inside' | 'outside')}>
          <option value="inside">Inward swing</option>
          <option value="outside">Outward swing</option>
        </select></label>
      </>}
      {shape.type === 'window' && <label>Window type<select value={windowType} onChange={(event) => {
        const next = event.target.value as WindowType;
        const def = OPENING_DEFINITIONS[next];
        setWindowType(next);
        setWidth(formatMmToUnit(def.defaultWidthMm, measurementUnit, drawingScale));
        setHeight(formatMmToUnit(def.defaultThicknessMm, measurementUnit, drawingScale));
      }}>
        {WINDOW_TYPES.map((type) => (
          <option key={type} value={type}>{OPENING_DEFINITIONS[type].label}</option>
        ))}
      </select></label>}
      <small>{shape.type === 'wall' ? 'Length preserves the wall’s first endpoint and direction. ' : isPath ? 'For paths, width and height scale the existing points. ' : ''}Decimals or fractions work, for example 12 3/8. Units like m, cm, mm, ft, in, ' and " are supported.</small>
      
      <fieldset style={{ marginTop: '1rem', border: '1px solid var(--cad-border-subtle)', padding: '0.5rem', borderRadius: '4px' }}>
        <legend style={{ fontSize: '0.85em', fontWeight: 'bold' }}>Style (Colors & Outline)</legend>
        <label>
          Fill Color
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="color" value={fillColor === 'transparent' ? '#ffffff' : fillColor} onChange={(e) => setFillColor(e.target.value)} />
            <input type="text" value={fillColor} onChange={(e) => setFillColor(e.target.value)} style={{ flex: 1 }} />
            <button type="button" onClick={() => setFillColor('transparent')} className="btn-secondary" style={{ padding: '2px 6px', fontSize: '10px' }}>Clear</button>
          </div>
        </label>
        <label>
          Stroke Color
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="color" value={strokeColor === 'transparent' ? '#000000' : strokeColor} onChange={(e) => setStrokeColor(e.target.value)} />
            <input type="text" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} style={{ flex: 1 }} />
            <button type="button" onClick={() => setStrokeColor('transparent')} className="btn-secondary" style={{ padding: '2px 6px', fontSize: '10px' }}>Clear</button>
          </div>
        </label>
        <label>
          Stroke Width (mm)
          <input type="range" min="0" max="100" step="1" value={strokeWidth} onChange={(e) => setStrokeWidth(e.target.value)} />
          <input type="number" min="0" step="0.1" value={strokeWidth} onChange={(e) => setStrokeWidth(e.target.value)} />
        </label>
      </fieldset>

      
      <fieldset style={{ marginTop: '1rem', border: '1px solid var(--cad-border-subtle)', padding: '0.5rem', borderRadius: '4px' }}>
        <legend style={{ fontSize: '0.85em', fontWeight: 'bold' }}>Advanced Effects</legend>
        <label>
          Opacity (0 to 1)
          <input type="range" min="0" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(e.target.value)} />
        </label>
        <label>
          Shadow Color
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="color" value={shadowColor === 'transparent' ? '#000000' : shadowColor} onChange={(e) => setShadowColor(e.target.value)} />
            <input type="text" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)} style={{ flex: 1 }} />
            <button type="button" onClick={() => setShadowColor('transparent')} className="btn-secondary" style={{ padding: '2px 6px', fontSize: '10px' }}>Clear</button>
          </div>
        </label>
        <label>
          Shadow Blur (px)
          <input type="range" min="0" max="100" step="1" value={shadowBlur} onChange={(e) => setShadowBlur(e.target.value)} />
        </label>
        <label>
          Shadow Offset X (px)
          <input type="number" step="1" value={shadowOffsetX} onChange={(e) => setShadowOffsetX(e.target.value)} />
        </label>
        <label>
          Shadow Offset Y (px)
          <input type="number" step="1" value={shadowOffsetY} onChange={(e) => setShadowOffsetY(e.target.value)} />
        </label>
      </fieldset>

      {error && <p role="alert" className="error">{error}</p>}
      <button type="submit" className="btn-primary">Apply properties</button>
    </form>
    <dl>
      {shape.type === 'wall' ? <><dt>Actual wall length</dt><dd>{formatMmToUnit(getWallLength(shape), measurementUnit, drawingScale)} {measurementUnit}</dd>
        <dt>Paper wall length — 1:25</dt><dd>{formatMmToUnit(paperMm(getWallLength(shape)), measurementUnit, drawingScale)} {measurementUnit}</dd></> : <><dt>Actual width × height</dt><dd>{formatMmToUnit(shape.width, measurementUnit, drawingScale)} {measurementUnit} × {formatMmToUnit(shape.height, measurementUnit, drawingScale)} {measurementUnit}</dd>
          <dt>Paper width × height — 1:25</dt><dd>{formatMmToUnit(paperMm(shape.width), measurementUnit, drawingScale)} {measurementUnit} × {formatMmToUnit(paperMm(shape.height), measurementUnit, drawingScale)} {measurementUnit}</dd>
          <dt>Position — actual {measurementUnit}</dt><dd>X {formatMmToUnit(shape.x, measurementUnit, drawingScale)}, Y {formatMmToUnit(shape.y, measurementUnit, drawingScale)}</dd></>}
    </dl>
  </section>;
}
