import { Circle, Ellipse, Group, Line, Rect } from 'react-konva';
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
      const bodyH = height - frontOverhang;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
        {/* Traditional blueprint diagonal 'X' through base cabinet */}
        <Line points={[0, 0, width, height]} stroke={subStroke} strokeWidth={subStrokeWidth} opacity={0.65} listening={false} />
        <Line points={[0, height, width, 0]} stroke={subStroke} strokeWidth={subStrokeWidth} opacity={0.65} listening={false} />
        {/* Countertop front overhang line */}
        <Line points={[0, bodyH, width, bodyH]} stroke={stroke} strokeWidth={subStrokeWidth} listening={false} />
        {/* Center split and door pulls */}
        {width > 500 && <Line points={[width / 2, 0, width / 2, bodyH]} stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />}
        <Line points={[width * 0.2, height - frontOverhang * 0.5, width * 0.35, height - frontOverhang * 0.5]}
          stroke={stroke} strokeWidth={subStrokeWidth * 1.5} listening={false} />
        {width > 500 && <Line points={[width * 0.65, height - frontOverhang * 0.5, width * 0.8, height - frontOverhang * 0.5]}
          stroke={stroke} strokeWidth={subStrokeWidth * 1.5} listening={false} />}
      </>;
    }

    case 'wall_cabinet': {
      const dash = [6 / scale, 4 / scale];
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} dash={dash} />
        {/* Diagonal line through upper cabinet */}
        <Line points={[0, 0, width, height]} stroke={subStroke} strokeWidth={subStrokeWidth} dash={[4 / scale, 4 / scale]} opacity={0.6} listening={false} />
        <Line points={[0, height, width, 0]} stroke={subStroke} strokeWidth={subStrokeWidth} dash={[4 / scale, 4 / scale]} opacity={0.6} listening={false} />
        {width > 500 && <Line points={[width / 2, 0, width / 2, height]} stroke={subStroke} strokeWidth={subStrokeWidth} dash={dash} listening={false} />}
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
        <Line points={[0, 0, width, height]} stroke={subStroke} strokeWidth={subStrokeWidth} dash={[5 / scale, 4 / scale]} opacity={0.7} listening={false} />
        <Line points={[0, height, width, 0]} stroke={subStroke} strokeWidth={subStrokeWidth} dash={[5 / scale, 4 / scale]} opacity={0.7} listening={false} />
        {width > 500 && <Line points={[width / 2, 0, width / 2, height]} stroke={stroke} strokeWidth={subStrokeWidth} listening={false} />}
      </>;
    }

    case 'tv_unit': {
      const frameCorner = Math.min(width, height) * 0.08;
      const bracketW = Math.min(width * 0.35, 300);
      const bracketH = Math.min(height * 0.3, 20);
      const inset = Math.max(1, 1.5 / scale);
      return <>
        {/* Wall mount bracket behind screen */}
        <Rect x={(width - bracketW) / 2} y={-bracketH} width={bracketW} height={bracketH + height * 0.5}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill="#475569" cornerRadius={1} listening={false} />
        {/* Flat Screen Frame */}
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth}
          fill="#0f172a" cornerRadius={frameCorner} />
        {/* Screen Glass Surface */}
        <Rect x={inset} y={inset}
          width={Math.max(1, width - 2 * inset)}
          height={Math.max(1, height - 2 * inset)}
          stroke={subStroke} strokeWidth={subStrokeWidth} fill="#1e293b" cornerRadius={Math.max(0, frameCorner - 1)} listening={false} />
        {/* Screen horizontal indicator */}
        <Line points={[width * 0.08, height * 0.5, width * 0.92, height * 0.5]}
          stroke={subStroke} strokeWidth={Math.max(1 / scale, 0.75)} opacity={0.6} listening={false} />
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

    case 'dresser': {
      const corner = Math.min(width, height) * 0.03;
      const pullMargin = width * 0.15;
      const pullW = Math.min(width * 0.22, 160);
      const isMultiColumn = width > 900;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} cornerRadius={corner} />
        <Line points={[0, height * 0.5, width, height * 0.5]} stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
        {isMultiColumn ? <>
          <Line points={[width * 0.5, 0, width * 0.5, height]} stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
          <Line points={[width * 0.25 - pullW * 0.5, height * 0.25, width * 0.25 + pullW * 0.5, height * 0.25]} stroke={stroke} strokeWidth={Math.max(2 / scale, 1.8)} listening={false} />
          <Line points={[width * 0.75 - pullW * 0.5, height * 0.25, width * 0.75 + pullW * 0.5, height * 0.25]} stroke={stroke} strokeWidth={Math.max(2 / scale, 1.8)} listening={false} />
          <Line points={[width * 0.25 - pullW * 0.5, height * 0.75, width * 0.25 + pullW * 0.5, height * 0.75]} stroke={stroke} strokeWidth={Math.max(2 / scale, 1.8)} listening={false} />
          <Line points={[width * 0.75 - pullW * 0.5, height * 0.75, width * 0.75 + pullW * 0.5, height * 0.75]} stroke={stroke} strokeWidth={Math.max(2 / scale, 1.8)} listening={false} />
        </> : <>
          <Line points={[pullMargin, height * 0.25, width - pullMargin, height * 0.25]} stroke={stroke} strokeWidth={Math.max(2 / scale, 1.8)} listening={false} />
          <Line points={[pullMargin, height * 0.75, width - pullMargin, height * 0.75]} stroke={stroke} strokeWidth={Math.max(2 / scale, 1.8)} listening={false} />
        </>}
      </>;
    }

    case 'refrigerator': {
      const doorDepth = Math.min(height * 0.18, 120);
      const bodyH = Math.max(10, height - doorDepth);
      const handleW = width * 0.65;
      const corner = Math.min(width, height) * 0.03;
      return <Group>
        {/* Main fridge body box */}
        <Rect width={width} height={bodyH} stroke={stroke} strokeWidth={strokeWidth} fill={fill} cornerRadius={[corner, corner, 0, 0]} />
        {/* Secondary front door section */}
        <Rect x={0} y={bodyH} width={width} height={doorDepth} stroke={stroke} strokeWidth={strokeWidth} fill={subFill} cornerRadius={[0, 0, corner, corner]} listening={false} />
        {/* Door handle / split line */}
        <Line points={[width * 0.5, bodyH, width * 0.5, height]} stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
        <Line points={[(width - handleW) / 2, bodyH + doorDepth * 0.5, (width + handleW) / 2, bodyH + doorDepth * 0.5]}
          stroke={stroke} strokeWidth={Math.max(2.5 / scale, 2)} lineCap="round" listening={false} />
        {/* Subtle interior shelf indicator */}
        <Line points={[width * 0.08, bodyH * 0.5, width * 0.92, bodyH * 0.5]} stroke={subStroke} strokeWidth={subStrokeWidth} dash={[4 / scale, 4 / scale]} opacity={0.5} listening={false} />
      </Group>;
    }

    case 'stove': {
      const consoleH = Math.min(height * 0.16, 100);
      const cookH = height - consoleH;
      const burnerR1 = Math.min(width, cookH) * 0.16;
      const burnerR2 = Math.min(width, cookH) * 0.13;
      const cy1 = consoleH + cookH * 0.3;
      const cy2 = consoleH + cookH * 0.72;
      const cx1 = width * 0.28;
      const cx2 = width * 0.72;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
        <Rect x={0} y={0} width={width} height={consoleH} stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Circle x={width * 0.2} y={consoleH * 0.5} radius={Math.min(consoleH * 0.25, 8)} fill={subStroke} listening={false} />
        <Circle x={width * 0.4} y={consoleH * 0.5} radius={Math.min(consoleH * 0.25, 8)} fill={subStroke} listening={false} />
        <Circle x={width * 0.6} y={consoleH * 0.5} radius={Math.min(consoleH * 0.25, 8)} fill={subStroke} listening={false} />
        <Circle x={width * 0.8} y={consoleH * 0.5} radius={Math.min(consoleH * 0.25, 8)} fill={subStroke} listening={false} />
        <Circle x={cx1} y={cy1} radius={burnerR1} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Circle x={cx2} y={cy1} radius={burnerR2} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Circle x={cx1} y={cy2} radius={burnerR2} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Circle x={cx2} y={cy2} radius={burnerR1} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
      </>;
    }

    case 'kitchen_sink': {
      const margin = Math.min(width, height) * 0.08;
      const dividerW = Math.min(width * 0.05, 30);
      const isDual = width > 650;
      const basinY = margin + Math.min(height * 0.15, 60);
      const basinH = height - basinY - margin;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} cornerRadius={Math.min(width, height) * 0.05} />
        <Circle x={width * 0.5} y={margin + (basinY - margin) * 0.5} radius={Math.min(margin * 1.2, 14)} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Line points={[width * 0.5, margin * 0.5, width * 0.5, basinY + 8]} stroke={stroke} strokeWidth={Math.max(2.5 / scale, 2)} listening={false} />
        {isDual ? <>
          {(() => {
            const availW = width - 2 * margin - dividerW;
            const singleW = availW / 2;
            const b1x = margin;
            const b2x = margin + singleW + dividerW;
            const r = Math.min(singleW, basinH) * 0.15;
            return <>
              <Rect x={b1x} y={basinY} width={singleW} height={basinH} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill} cornerRadius={r} listening={false} />
              <Circle x={b1x + singleW * 0.5} y={basinY + basinH * 0.5} radius={Math.min(singleW, basinH) * 0.12} stroke={subStroke} strokeWidth={subStrokeWidth} fill={fill} listening={false} />
              <Rect x={b2x} y={basinY} width={singleW} height={basinH} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill} cornerRadius={r} listening={false} />
              <Circle x={b2x + singleW * 0.5} y={basinY + basinH * 0.5} radius={Math.min(singleW, basinH) * 0.12} stroke={subStroke} strokeWidth={subStrokeWidth} fill={fill} listening={false} />
            </>;
          })()}
        </> : <>
          {(() => {
            const bW = width - 2 * margin;
            const r = Math.min(bW, basinH) * 0.15;
            return <>
              <Rect x={margin} y={basinY} width={bW} height={basinH} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill} cornerRadius={r} listening={false} />
              <Circle x={width * 0.5} y={basinY + basinH * 0.5} radius={Math.min(bW, basinH) * 0.12} stroke={subStroke} strokeWidth={subStrokeWidth} fill={fill} listening={false} />
            </>;
          })()}
        </>}
      </>;
    }

    case 'bathroom_vanity': {
      const margin = Math.min(width, height) * 0.1;
      const rx = Math.max(10, (width - 2 * margin) * 0.38);
      const ry = Math.max(10, (height - 2 * margin) * 0.35);
      const cx = width * 0.5;
      const cy = height * 0.55;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} cornerRadius={4} />
        <Ellipse x={cx} y={cy} radiusX={rx} radiusY={ry} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Circle x={cx} y={cy} radius={Math.min(rx, ry) * 0.22} stroke={subStroke} strokeWidth={subStrokeWidth} fill={fill} listening={false} />
        <Circle x={cx} y={margin + 10} radius={6} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Line points={[cx, margin + 4, cx, cy - ry + 4]} stroke={stroke} strokeWidth={Math.max(2.5 / scale, 2)} listening={false} />
      </>;
    }

    case 'toilet': {
      const tankH = Math.min(height * 0.28, 200);
      const tankCorner = Math.min(width, tankH) * 0.15;
      const bowlW = Math.min(width * 0.75, width - 20);
      const bowlH = Math.max(10, height - tankH);
      const bowlCenterY = tankH + bowlH * 0.48;
      const rx = bowlW * 0.5;
      const ry = bowlH * 0.48;
      return <>
        <Rect x={0} y={0} width={width} height={tankH} stroke={stroke} strokeWidth={strokeWidth} fill={fill} cornerRadius={tankCorner} />
        <Line points={[width * 0.15, tankH * 0.5, width * 0.3, tankH * 0.5]} stroke={subStroke} strokeWidth={Math.max(2 / scale, 1.8)} listening={false} />
        <Ellipse x={width * 0.5} y={bowlCenterY} radiusX={rx} radiusY={ry} stroke={stroke} strokeWidth={strokeWidth} fill={fill} listening={false} />
        <Ellipse x={width * 0.5} y={bowlCenterY + ry * 0.1} radiusX={rx * 0.72} radiusY={ry * 0.68} stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
      </>;
    }

    case 'bathtub': {
      const corner = Math.min(width, height) * 0.04;
      const rim = Math.min(width, height) * 0.08;
      const innerW = width - 2 * rim;
      const innerH = height - 2 * rim;
      const innerCorner = Math.min(innerW, innerH) * 0.35;
      const drainX = rim + innerW * 0.15;
      const drainY = height * 0.5;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} cornerRadius={corner} />
        <Rect x={rim} y={rim} width={innerW} height={innerH} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill} cornerRadius={innerCorner} listening={false} />
        <Circle x={drainX} y={drainY} radius={Math.min(innerW, innerH) * 0.08} stroke={subStroke} strokeWidth={subStrokeWidth} fill={fill} listening={false} />
        <Line points={[rim * 0.5, drainY, rim + 10, drainY]} stroke={stroke} strokeWidth={Math.max(2.5 / scale, 2)} listening={false} />
      </>;
    }

    case 'shower': {
      const corner = Math.min(width, height) * 0.03;
      const curb = Math.min(width, height) * 0.08;
      const drainR = Math.min(width, height) * 0.06;
      return <>
        <Rect width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} cornerRadius={corner} />
        <Rect x={curb} y={curb} width={width - 2 * curb} height={height - 2 * curb} stroke={subStroke} strokeWidth={subStrokeWidth} fill={subFill} listening={false} />
        <Line points={[curb, curb, width - curb, height - curb]} stroke={subStroke} strokeWidth={subStrokeWidth} dash={[4 / scale, 4 / scale]} listening={false} />
        <Line points={[width - curb, curb, curb, height - curb]} stroke={subStroke} strokeWidth={subStrokeWidth} dash={[4 / scale, 4 / scale]} listening={false} />
        <Circle x={width * 0.5} y={height * 0.5} radius={drainR} stroke={stroke} strokeWidth={strokeWidth} fill={fill} listening={false} />
        <Line points={[width * 0.5 - drainR, height * 0.5, width * 0.5 + drainR, height * 0.5]} stroke={stroke} strokeWidth={subStrokeWidth} listening={false} />
        <Line points={[width * 0.5, height * 0.5 - drainR, width * 0.5, height * 0.5 + drainR]} stroke={stroke} strokeWidth={subStrokeWidth} listening={false} />
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

