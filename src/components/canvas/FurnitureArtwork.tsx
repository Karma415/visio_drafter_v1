import { Circle, Ellipse, Line, Rect } from 'react-konva';
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

    case 'desk': {
      const corner = Math.min(width, height) * 0.04;
      const modestyH = Math.min(height * 0.12, 50);
      const pedestalW = Math.min(width * 0.32, 420);
      const pedestalX = width - pedestalW;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} cornerRadius={corner} />
        <Rect x={0} y={0} width={width} height={modestyH}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        {width > 600 && <Rect x={pedestalX} y={modestyH} width={pedestalW} height={height - modestyH}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />}
        {width > 600 && <Line points={[pedestalX + pedestalW * 0.25, height - 15, pedestalX + pedestalW * 0.75, height - 15]}
          stroke={stroke} strokeWidth={subStrokeWidth * 1.5} listening={false} />}
      </>;
    }

    case 'l_desk': {
      const mainDepth = Math.min(height * 0.45, 650, height * 0.7);
      const returnWidth = Math.min(width * 0.45, 650, width * 0.7);
      const points = [0, 0, width, 0, width, mainDepth, returnWidth, mainDepth, returnWidth, height, 0, height];
      return <>
        <Line points={points} closed={true} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} lineCap="round" lineJoin="round" />
        <Line points={[returnWidth, 0, returnWidth, mainDepth]}
          stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
        <Line points={[0, Math.min(mainDepth * 0.15, 40), width, Math.min(mainDepth * 0.15, 40)]}
          stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
        <Line points={[Math.min(returnWidth * 0.15, 40), mainDepth, Math.min(returnWidth * 0.15, 40), height]}
          stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
      </>;
    }

    case 'floor_cabinet': {
      const frontOverhang = Math.min(height * 0.12, 50);
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} />
        <Line points={[0, height - frontOverhang, width, height - frontOverhang]}
          stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
        {width > 500 && <Line points={[width / 2, 0, width / 2, height - frontOverhang]}
          stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />}
        <Line points={[width * 0.2, height - frontOverhang * 0.5, width * 0.35, height - frontOverhang * 0.5]}
          stroke={stroke} strokeWidth={subStrokeWidth * 1.5} listening={false} />
        {width > 500 && <Line points={[width * 0.65, height - frontOverhang * 0.5, width * 0.8, height - frontOverhang * 0.5]}
          stroke={stroke} strokeWidth={subStrokeWidth * 1.5} listening={false} />}
      </>;
    }

    case 'wall_cabinet': {
      const dash = [6 / scale, 4 / scale];
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} dash={dash} />
        {width > 500 && <Line points={[width / 2, 0, width / 2, height]}
          stroke={subStroke} strokeWidth={subStrokeWidth} dash={dash} listening={false} />}
        <Line points={[width * 0.1, height * 0.5, width * 0.9, height * 0.5]}
          stroke={subStroke} strokeWidth={subStrokeWidth} dash={dash} listening={false} />
      </>;
    }

    case 'bookshelf': {
      const sideW = Math.min(width * 0.04, 25);
      const numDividers = width > 1200 ? 3 : width > 600 ? 2 : 1;
      const step = (width - 2 * sideW) / (numDividers + 1);
      const shelfY = height * 0.3;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
        <Rect x={0} y={0} width={sideW} height={height} stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Rect x={width - sideW} y={0} width={sideW} height={height} stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Line points={[sideW, shelfY, width - sideW, shelfY]} stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
        {Array.from({ length: numDividers }).map((_, i) => (
          <Line key={i} points={[sideW + step * (i + 1), 0, sideW + step * (i + 1), height]}
            stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
        ))}
      </>;
    }

    case 'tall_cabinet': {
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
        <Line points={[0, 0, width, height]} stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
        <Line points={[0, height, width, 0]} stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
        {width > 500 && <Line points={[width / 2, 0, width / 2, height]} stroke={stroke} strokeWidth={subStrokeWidth} listening={false} />}
      </>;
    }

    case 'tv_unit': {
      const screenW = Math.min(width * 0.82, 1800);
      const screenThick = Math.min(height * 0.16, 45);
      const screenX = (width - screenW) / 2;
      const screenY = height * 0.32;
      const standW = Math.min(screenW * 0.4, 250);
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} cornerRadius={Math.min(width, height) * 0.05} />
        <Rect x={(width - standW) / 2} y={screenY + screenThick} width={standW} height={Math.min(height * 0.22, 60)}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} cornerRadius={2} listening={false} />
        <Rect x={screenX} y={screenY} width={screenW} height={screenThick}
          stroke={stroke} strokeWidth={strokeWidth} fill="#1e293b" cornerRadius={2} listening={false} />
      </>;
    }

    case 'desk_chair': {
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) / 2;
      const backH = Math.min(height * 0.22, 100);
      const armW = Math.min(width * 0.15, 70);
      const armH = Math.min(height * 0.38, 180);
      return <>
        <Ellipse x={cx} y={cy} radiusX={r * 0.75} radiusY={r * 0.7}
          stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
        <Rect x={width * 0.12} y={0} width={width * 0.76} height={backH}
          stroke={stroke} strokeWidth={strokeWidth} fill={subFill}
          cornerRadius={[10, 10, 4, 4]} listening={false} />
        <Rect x={width * 0.04} y={height * 0.3} width={armW} height={armH}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} cornerRadius={6} listening={false} />
        <Rect x={width - armW - width * 0.04} y={height * 0.3} width={armW} height={armH}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} cornerRadius={6} listening={false} />
        <Circle x={cx} y={cy} radius={Math.min(r * 0.15, 12)}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subStroke} listening={false} />
      </>;
    }

    case 'console_table': {
      const corner = Math.min(width, height) * 0.06;
      const postSize = Math.min(width * 0.08, height * 0.25, 40);
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} cornerRadius={corner} />
        <Rect x={4} y={4} width={postSize} height={postSize}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Rect x={width - postSize - 4} y={4} width={postSize} height={postSize}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Rect x={4} y={height - postSize - 4} width={postSize} height={postSize}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Rect x={width - postSize - 4} y={height - postSize - 4} width={postSize} height={postSize}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Line points={[postSize + 8, height / 2, width - postSize - 8, height / 2]}
          stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
      </>;
    }

    case 'wall_shelf': {
      const bracketW = Math.min(width * 0.08, 30);
      const b1 = width * 0.2;
      const b2 = width * 0.8 - bracketW;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} cornerRadius={2} />
        <Rect x={b1} y={0} width={bracketW} height={height}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Rect x={b2} y={0} width={bracketW} height={height}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
      </>;
    }

    case 'washer_dryer': {
      const consoleH = Math.min(height * 0.2, 130);
      const drumCenterY = consoleH + (height - consoleH) / 2;
      const drumR = Math.min(width, height - consoleH) * 0.38;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} cornerRadius={Math.min(width, height) * 0.04} />
        <Rect x={0} y={0} width={width} height={consoleH}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Line points={[width * 0.65, consoleH * 0.5, width * 0.85, consoleH * 0.5]}
          stroke={stroke} strokeWidth={Math.max(2 / scale, 2)} listening={false} />
        <Circle x={width / 2} y={drumCenterY} radius={drumR}
          stroke={stroke} strokeWidth={strokeWidth} fill={subFill} listening={false} />
        <Circle x={width / 2} y={drumCenterY} radius={drumR * 0.72}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={fill} listening={false} />
      </>;
    }

    case 'dishwasher': {
      const doorH = Math.min(height * 0.2, 110);
      const handleW = width * 0.55;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
        <Rect x={0} y={height - doorH} width={width} height={doorH}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Line points={[(width - handleW) / 2, height - doorH * 0.5, (width + handleW) / 2, height - doorH * 0.5]}
          stroke={stroke} strokeWidth={Math.max(2.5 / scale, 2)} listening={false} />
        <Line points={[width * 0.15, height * 0.25, width * 0.85, height * 0.25]}
          stroke={subStroke} strokeWidth={subStrokeWidth} dash={[6 / scale, 4 / scale]} listening={false} />
        <Line points={[width * 0.15, height * 0.55, width * 0.85, height * 0.55]}
          stroke={subStroke} strokeWidth={subStrokeWidth} dash={[6 / scale, 4 / scale]} listening={false} />
      </>;
    }

    case 'countertop_dishwasher': {
      const panelH = Math.min(height * 0.22, 90);
      const corner = Math.min(width, height) * 0.05;
      const windowH = Math.max(10, height - panelH - height * 0.2);
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill={fill} cornerRadius={corner} />
        <Rect x={width * 0.08} y={height * 0.08} width={width * 0.84} height={windowH}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} cornerRadius={4} listening={false} />
        <Rect x={0} y={height - panelH} width={width} height={panelH}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} cornerRadius={[0, 0, corner, corner]} listening={false} />
        <Line points={[width * 0.25, height - panelH * 0.5, width * 0.75, height - panelH * 0.5]}
          stroke={stroke} strokeWidth={Math.max(2 / scale, 1.8)} listening={false} />
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

