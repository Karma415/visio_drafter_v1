import { Ellipse, Line, Rect } from 'react-konva';
import type { Shape } from '../../domain/document';

interface Props { shape: Shape; selected: boolean; scale: number }

/**
 * Clean architectural floor-plan symbols for furniture.
 * Neutral outlines and subtle fills for drafting clarity;
 * selection, dragging, and rotation remain owned by the parent shape.
 */
export function FurnitureArtwork({ shape, selected, scale }: Props) {
  const stroke = selected ? '#1d4ed8' : '#334155';
  const subStroke = selected ? '#3b82f6' : '#64748b';
  const fill = selected ? '#eff6ff' : '#ffffff';
  const subFill = selected ? '#dbeafe' : '#f8fafc';
  const strokeWidth = selected ? Math.max(2 / scale, 1.5) : Math.max(1.5 / scale, 1);
  const subStrokeWidth = Math.max(1 / scale, 0.75);

  const { width, height } = shape;

  switch (shape.furnitureKind ?? 'bed') {
    case 'sofa': {
      const armW = Math.min(width * 0.16, 180, width * 0.35);
      const backH = Math.min(height * 0.28, 220, height * 0.45);
      const outerCorner = Math.min(width, height) * 0.08;
      const seatW = width - 2 * armW;
      const hasThreeCushions = seatW > 1400;

      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} cornerRadius={outerCorner} />
        <Rect x={armW} y={0} width={Math.max(1, seatW)} height={backH}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Rect x={0} y={0} width={armW} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={subFill} cornerRadius={[outerCorner, 0, 0, outerCorner]} listening={false} />
        <Rect x={width - armW} y={0} width={armW} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={subFill} cornerRadius={[0, outerCorner, outerCorner, 0]} listening={false} />
        {seatW > 40 && (hasThreeCushions ? <>
          <Line points={[armW + seatW / 3, backH, armW + seatW / 3, height]}
            stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
          <Line points={[armW + (2 * seatW) / 3, backH, armW + (2 * seatW) / 3, height]}
            stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
        </> : <Line points={[width * 0.5, backH, width * 0.5, height]}
          stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />)}
      </>;
    }

    case 'table': {
      const isRound = Math.abs(width - height) < Math.min(width, height) * 0.12;
      if (isRound) {
        const cx = width / 2;
        const cy = height / 2;
        const rx = width / 2;
        const ry = height / 2;
        const inset = Math.min(rx, ry) * 0.08;
        return <>
          <Ellipse x={cx} y={cy} radiusX={rx} radiusY={ry}
            stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
          <Ellipse x={cx} y={cy} radiusX={Math.max(1, rx - inset)} radiusY={Math.max(1, ry - inset)}
            stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        </>;
      }
      const corner = Math.min(width, height) * 0.04;
      const inset = Math.min(width, height) * 0.08;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} cornerRadius={corner} />
        <Rect x={inset} y={inset} width={Math.max(1, width - 2 * inset)} height={Math.max(1, height - 2 * inset)}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} cornerRadius={corner * 0.5} listening={false} />
      </>;
    }

    case 'chair': {
      const corner = Math.min(width, height) * 0.15;
      const backH = Math.min(height * 0.24, 120, height * 0.4);
      const inset = Math.min(width, height) * 0.12;
      const seatH = Math.max(1, height - backH - inset);

      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} cornerRadius={[corner, corner, corner * 1.5, corner * 1.5]} />
        <Rect x={0} y={0} width={width} height={backH} stroke={stroke} strokeWidth={strokeWidth}
          fill={subFill} cornerRadius={[corner, corner, 0, 0]} listening={false} />
        <Rect x={inset} y={backH + inset * 0.5} width={Math.max(1, width - 2 * inset)} height={seatH}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={fill} cornerRadius={corner} listening={false} />
      </>;
    }

    case 'bed':
    default: {
      const headboardH = Math.min(height * 0.1, 150);
      const pillowMargin = width * 0.08;
      const pillowGap = width * 0.06;
      const availW = width - 2 * pillowMargin - pillowGap;
      const pillowH = Math.min(height * 0.22, Math.max(10, (height - headboardH) * 0.45), 450);
      const pillowY = headboardH + Math.min(height * 0.03, 30);
      const foldY = Math.min(height * 0.46, Math.max(pillowY + pillowH + 20, height - 20));

      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} cornerRadius={Math.min(width, height) * 0.03} />
        <Rect x={0} y={0} width={width} height={headboardH}
          stroke={stroke} strokeWidth={strokeWidth} fill={subFill} listening={false} />
        {availW > 20 ? <>
          <Rect x={pillowMargin} y={pillowY} width={availW / 2} height={pillowH}
            stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill}
            cornerRadius={Math.min(availW / 2, pillowH) * 0.15} listening={false} />
          <Rect x={pillowMargin + availW / 2 + pillowGap} y={pillowY} width={availW / 2} height={pillowH}
            stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill}
            cornerRadius={Math.min(availW / 2, pillowH) * 0.15} listening={false} />
        </> : <Rect x={pillowMargin} y={pillowY} width={Math.max(1, width - 2 * pillowMargin)} height={pillowH}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill}
          cornerRadius={Math.min(width - 2 * pillowMargin, pillowH) * 0.15} listening={false} />}
        {foldY > headboardH + 20 && <Line points={[0, foldY, width, foldY]}
          stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />}
      </>;
    }
  }
}

