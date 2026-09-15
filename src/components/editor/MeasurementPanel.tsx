import { useState } from 'react';
import type { Shape } from '../../domain/document';
import { formatMetric, formatNumber, inchesToMm, mmToInches, paperMm, parseInches } from '../../domain/units';
import { useDrawingStore } from '../../store/useDrawingStore';
import { WALL_DEFINITIONS, WALL_TYPES } from '../../domain/walls';
import { useEditorStore } from '../../store/useEditorStore';
import { wallLength as getWallLength } from '../../domain/geometry';
import { DEFAULT_FURNITURE_KIND, FURNITURE_CATEGORIES, FURNITURE_DEFINITIONS, FURNITURE_KINDS } from '../../domain/furniture';
import type { DoorType, WindowType } from '../../domain/doors';
import { DEFAULT_DOOR_TYPE, DEFAULT_WINDOW_TYPE, DOOR_TYPES, OPENING_DEFINITIONS, WINDOW_TYPES } from '../../domain/doors';

interface Props { shape: Shape; unit: 'mm' | 'cm' }
export function MeasurementPanel({ shape, unit }: Props) {
  const [width, setWidth] = useState(String(Number(mmToInches(shape.width).toFixed(8))));
  const [height, setHeight] = useState(String(Number(mmToInches(shape.height).toFixed(8))));
  const [x, setX] = useState(String(Number(mmToInches(shape.x).toFixed(8))));
  const [y, setY] = useState(String(Number(mmToInches(shape.y).toFixed(8))));
  const [rotation, setRotation] = useState(String(shape.rotation ?? 0));
  const [startAngle, setStartAngle] = useState(String(shape.startAngle ?? 0));
  const [endAngle, setEndAngle] = useState(String(shape.endAngle ?? 180));
  const [wallType, setWallType] = useState(shape.wallType ?? 'interior_partition');
  const [wallThickness, setWallThickness] = useState(String(Number(mmToInches(shape.wallThicknessMm ?? 101.6).toFixed(8))));
  const [wallLength, setWallLength] = useState(String(Number(mmToInches(getWallLength(shape)).toFixed(8))));
  const [furnitureKind, setFurnitureKind] = useState(shape.furnitureKind ?? DEFAULT_FURNITURE_KIND);
  const [doorType, setDoorType] = useState<DoorType>(shape.doorType ?? DEFAULT_DOOR_TYPE);
  const [windowType, setWindowType] = useState<WindowType>(shape.windowType ?? DEFAULT_WINDOW_TYPE);
  const [swingHinge, setSwingHinge] = useState<'left' | 'right'>(shape.swingHinge ?? 'left');
  const [swingDirection, setSwingDirection] = useState<'inside' | 'outside'>(shape.swingDirection ?? 'inside');
  const [error, setError] = useState('');
  const isPath = shape.type === 'line' || shape.type === 'polyline' || shape.type === 'polygon' || shape.type === 'wall' || shape.type === 'measurement';
  return <section aria-labelledby="selection-title">
    <h2 id="selection-title">Selected {shape.type}</h2>
    <form onSubmit={(event) => {
      event.preventDefault();
      try {
        if (shape.type === 'wall') {
          const wallThicknessMm = inchesToMm(parseInches(wallThickness));
          const lengthMm = inchesToMm(parseInches(wallLength));
          const numericRotation = Number(rotation);
          if (!Number.isFinite(numericRotation)) throw new Error('Rotation must be a number of degrees.');
          useDrawingStore.getState().updateWallProperties(shape.id, { wallType, wallThicknessMm, lengthMm, rotation: numericRotation });
          useEditorStore.getState().setWallDefaults({ wallType, wallThicknessMm });
          setError('');
          return;
        }
        const bounds = {
          x: inchesToMm(parseInches(x)), y: inchesToMm(parseInches(y)),
          width: inchesToMm(parseInches(width)), height: inchesToMm(parseInches(height)),
        };
        const numericRotation = Number(rotation);
        if (!Number.isFinite(numericRotation)) throw new Error('Rotation must be a number of degrees.');
        const properties: {
          fill?: string;
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
        } = { rotation: numericRotation };
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
      {shape.type !== 'wall' && <><label>X position — actual inches<input value={x} onChange={(event) => setX(event.target.value)} /></label>
        <label>Y position — actual inches<input value={y} onChange={(event) => setY(event.target.value)} /></label>
        <label>{shape.type === 'door' || shape.type === 'window' ? 'Opening width — actual inches' : 'Width — actual inches'}<input value={width} onChange={(event) => setWidth(event.target.value)} /></label>
        <label>{shape.type === 'door' || shape.type === 'window' ? 'Wall / jamb thickness — actual inches' : 'Height — actual inches'}<input value={height} onChange={(event) => setHeight(event.target.value)} /></label></>}
      {shape.type !== 'measurement' && <label>Rotation — degrees<input inputMode="decimal" value={rotation} onChange={(event) => setRotation(event.target.value)} /></label>}
      {shape.type === 'arc' && <><label>Arc start — degrees<input inputMode="decimal" value={startAngle} onChange={(event) => setStartAngle(event.target.value)} /></label>
        <label>Arc end — degrees<input inputMode="decimal" value={endAngle} onChange={(event) => setEndAngle(event.target.value)} /></label></>}
      {shape.type === 'wall' && <><label>Wall assembly<select value={wallType} onChange={(event) => setWallType(event.target.value as typeof wallType)}>{WALL_TYPES.map((type) => <option key={type} value={type}>{WALL_DEFINITIONS[type].label}</option>)}</select></label>
        <label>Wall thickness — actual inches<input value={wallThickness} onChange={(event) => setWallThickness(event.target.value)} /></label>
        <label>Wall length — actual inches<input value={wallLength} onChange={(event) => setWallLength(event.target.value)} /></label></>}
      {shape.type === 'furniture' && <label>Furniture type<select value={furnitureKind} onChange={(event) => {
        const next = event.target.value as typeof furnitureKind;
        const definition = FURNITURE_DEFINITIONS[next];
        setFurnitureKind(next);
        setWidth(String(Number(mmToInches(definition.defaultWidthMm).toFixed(8))));
        setHeight(String(Number(mmToInches(definition.defaultHeightMm).toFixed(8))));
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
          setWidth(String(Number(mmToInches(def.defaultWidthMm).toFixed(8))));
          setHeight(String(Number(mmToInches(def.defaultThicknessMm).toFixed(8))));
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
        setWidth(String(Number(mmToInches(def.defaultWidthMm).toFixed(8))));
        setHeight(String(Number(mmToInches(def.defaultThicknessMm).toFixed(8))));
      }}>
        {WINDOW_TYPES.map((type) => (
          <option key={type} value={type}>{OPENING_DEFINITIONS[type].label}</option>
        ))}
      </select></label>}
      <small>{shape.type === 'wall' ? 'Length preserves the wall’s first endpoint and direction. ' : isPath ? 'For paths, width and height scale the existing points. ' : ''}Decimals or fractions work, for example 12 3/8.</small>
      {error && <p role="alert" className="error">{error}</p>}
      <button type="submit" className="btn-primary">Apply properties</button>
    </form>
    <dl>
      {shape.type === 'wall' ? <><dt>Actual wall length</dt><dd>{formatMetric(getWallLength(shape), unit)}</dd>
        <dt>Paper wall length — 1:25</dt><dd>{formatMetric(paperMm(getWallLength(shape)), unit)}</dd></> : <><dt>Actual width × height</dt><dd>{formatMetric(shape.width, unit)} × {formatMetric(shape.height, unit)}</dd>
          <dt>Paper width × height — 1:25</dt><dd>{formatMetric(paperMm(shape.width), unit)} × {formatMetric(paperMm(shape.height), unit)}</dd>
          <dt>Position — actual inches</dt><dd>X {formatNumber(mmToInches(shape.x))}, Y {formatNumber(mmToInches(shape.y))}</dd></>}
    </dl>
  </section>;
}
