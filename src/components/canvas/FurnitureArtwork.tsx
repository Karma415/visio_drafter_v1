import { Ellipse, Line, Rect } from 'react-konva';
import type { Shape } from '../../domain/document';

interface Props { shape: Shape; selected: boolean; scale: number }

/** Pure visual content. The parent Group owns selection, dragging and rotation. */
export function FurnitureArtwork({ shape, selected, scale }: Props) {
  const stroke = selected ? '#1d4ed8' : '#334155';
  const strokeWidth = 2 / scale;
  const common = { stroke, strokeWidth, fill: shape.fill };
  const inset = Math.min(shape.width, shape.height) * 0.12;
  switch (shape.furnitureKind ?? 'bed') {
    case 'sofa':
      return <>
        <Rect {...common} width={shape.width} height={shape.height} cornerRadius={Math.min(shape.width, shape.height) * 0.1} />
        <Rect x={inset} y={inset} width={shape.width - inset * 2} height={shape.height * 0.46} stroke={stroke} strokeWidth={strokeWidth} fill="#ffffff55" cornerRadius={inset / 2} listening={false} />
        <Line points={[shape.width * 0.5, inset, shape.width * 0.5, shape.height * 0.56]} stroke={stroke} strokeWidth={strokeWidth} listening={false} />
      </>;
    case 'table':
      return <>
        <Ellipse {...common} x={shape.width / 2} y={shape.height / 2} radiusX={shape.width / 2} radiusY={shape.height / 2} />
        <Ellipse x={shape.width / 2} y={shape.height / 2} radiusX={Math.max(1, shape.width / 2 - inset)} radiusY={Math.max(1, shape.height / 2 - inset)} stroke={stroke} strokeWidth={strokeWidth} listening={false} />
      </>;
    case 'chair':
      return <>
        <Rect {...common} width={shape.width} height={shape.height} cornerRadius={Math.min(shape.width, shape.height) * 0.08} />
        <Rect x={inset} y={inset} width={shape.width - inset * 2} height={shape.height * 0.46} stroke={stroke} strokeWidth={strokeWidth} fill="#ffffff55" listening={false} />
      </>;
    case 'bed':
    default:
      return <>
        <Rect {...common} width={shape.width} height={shape.height} cornerRadius={Math.min(shape.width, shape.height) * 0.04} />
        <Rect x={inset} y={inset} width={shape.width - inset * 2} height={shape.height * 0.21} stroke={stroke} strokeWidth={strokeWidth} fill="#ffffffaa" cornerRadius={inset / 3} listening={false} />
        <Line points={[0, shape.height * 0.31, shape.width, shape.height * 0.31]} stroke={stroke} strokeWidth={strokeWidth} listening={false} />
      </>;
  }
}
