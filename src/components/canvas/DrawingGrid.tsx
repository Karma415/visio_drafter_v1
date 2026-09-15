import { useMemo } from 'react';
import { Layer, Line } from 'react-konva';
import type { Point } from '../../domain/geometry';
import { visibleGridStep } from '../../domain/geometry';

interface Props { width: number; height: number; scale: number; position: Point; gridMm: number }
export function DrawingGrid({ width, height, scale, position, gridMm }: Props) {
  const lines = useMemo(() => {
    const step = visibleGridStep(gridMm, scale);
    const left = -position.x / scale;
    const top = -position.y / scale;
    const right = left + width / scale;
    const bottom = top + height / scale;
    const result: { key: string; points: number[] }[] = [];
    for (let x = Math.floor(left / step) * step; x <= right; x += step) {
      result.push({ key: `x${x}`, points: [x, top, x, bottom] });
    }
    for (let y = Math.floor(top / step) * step; y <= bottom; y += step) {
      result.push({ key: `y${y}`, points: [left, y, right, y] });
    }
    return result;
  }, [width, height, scale, position, gridMm]);
  return <Layer listening={false}>{lines.map((line) =>
    <Line key={line.key} points={line.points} stroke="#d6dee8" strokeWidth={1 / scale} />,
  )}</Layer>;
}
