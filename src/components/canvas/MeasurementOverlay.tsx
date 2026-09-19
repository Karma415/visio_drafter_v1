import { Circle, Line, Text } from 'react-konva';
import type { ShapePoint } from '../../domain/document';
import { distanceBetween } from '../../domain/geometry';
import { formatMetric, formatNumber, mmToInches } from '../../domain/units';

interface Props {
  start: ShapePoint;
  end: ShapePoint;
  scale: number;
  unit: 'mm' | 'cm';
  preview: boolean;
}

/** Preview shown only while the user is choosing the second endpoint. */
export function MeasurementOverlay({ start, end, scale, unit, preview }: Props) {
  const length = distanceBetween(start, end);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const fontSize = 16 / scale;
  const label = `${formatMetric(length, unit)} · ${formatNumber(mmToInches(length))} in`;
  return <>
    <Line points={[start.x, start.y, end.x, end.y]} stroke="#dc2626" strokeWidth={2 / scale}
      dash={preview ? [8 / scale, 5 / scale] : undefined} lineCap="butt" listening={false} />
    <Circle x={start.x} y={start.y} radius={5 / scale} fill="#dc2626" listening={false} />
    <Circle x={end.x} y={end.y} radius={5 / scale} fill="#dc2626" listening={false} />
    <Text x={midX + 8 / scale} y={midY - 24 / scale} text={label} fontSize={fontSize}
      fill="#991b1b" padding={4 / scale} fillAfterStrokeEnabled={true} listening={false} />
  </>;
}
