import { Arc, Line, Rect } from 'react-konva';
import type { Shape } from '../../domain/document';

interface Props {
  shape: Shape;
  selected: boolean;
  scale: number;
}

/**
 * Clean, standard architectural floor-plan symbols for doors and windows.
 */
export function DoorArtwork({ shape, selected, scale }: Props) {
  const stroke = selected ? '#1d4ed8' : '#1e293b';
  const subStroke = selected ? '#3b82f6' : '#64748b';
  const arcStroke = selected ? '#2563eb' : '#94a3b8';
  const fill = selected ? '#eff6ff' : '#ffffff';
  const jambFill = selected ? '#dbeafe' : '#cbd5e1';
  const strokeWidth = selected ? Math.max(2 / scale, 1.5) : Math.max(1.5 / scale, 1);
  const subStrokeWidth = Math.max(1 / scale, 0.75);

  const { width, height } = shape;
  const jambW = Math.min(width * 0.08, 60, width * 0.2);
  const openingW = Math.max(10, width - 2 * jambW);

  if (shape.type === 'window') {
    const sillOverhang = Math.min(width * 0.04, 30);
    const sillH = Math.min(height * 0.25, 25);
    const glassInset = Math.min(height * 0.28, 30);

    switch (shape.windowType ?? 'standard_window') {
      case 'large_window': {
        const paneW = openingW / 3;
        return <>
          <Rect x={-sillOverhang} y={height} width={width + 2 * sillOverhang} height={sillH}
            stroke={stroke} strokeWidth={strokeWidth} fill={jambFill} cornerRadius={2} />
          <Rect x={0} y={0} width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
          <Rect x={0} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={subStrokeWidth} fill={jambFill} listening={false} />
          <Rect x={width - jambW} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={subStrokeWidth} fill={jambFill} listening={false} />
          <Line points={[jambW + paneW, 0, jambW + paneW, height]} stroke={stroke} strokeWidth={subStrokeWidth} listening={false} />
          <Line points={[jambW + 2 * paneW, 0, jambW + 2 * paneW, height]} stroke={stroke} strokeWidth={subStrokeWidth} listening={false} />
          <Line points={[jambW, glassInset, width - jambW, glassInset]} stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
          <Line points={[jambW, height - glassInset, width - jambW, height - glassInset]} stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
        </>;
      }

      case 'sliding_window': {
        const paneW = openingW * 0.55;
        const cy = height * 0.5;
        return <>
          <Rect x={-sillOverhang} y={height} width={width + 2 * sillOverhang} height={sillH}
            stroke={stroke} strokeWidth={strokeWidth} fill={jambFill} cornerRadius={2} />
          <Rect x={0} y={0} width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
          <Rect x={0} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={subStrokeWidth} fill={jambFill} listening={false} />
          <Rect x={width - jambW} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={subStrokeWidth} fill={jambFill} listening={false} />
          <Rect x={jambW} y={cy - glassInset} width={paneW} height={glassInset} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill(selected)} listening={false} />
          <Rect x={width - jambW - paneW} y={cy} width={paneW} height={glassInset} stroke={stroke} strokeWidth={subStrokeWidth} fill={subFill(selected)} listening={false} />
        </>;
      }

      case 'standard_window':
      default: {
        return <>
          <Rect x={-sillOverhang} y={height} width={width + 2 * sillOverhang} height={sillH}
            stroke={stroke} strokeWidth={strokeWidth} fill={jambFill} cornerRadius={2} />
          <Rect x={0} y={0} width={width} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
          <Rect x={0} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={subStrokeWidth} fill={jambFill} listening={false} />
          <Rect x={width - jambW} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={subStrokeWidth} fill={jambFill} listening={false} />
          <Line points={[jambW, glassInset, width - jambW, glassInset]} stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
          <Line points={[jambW, height - glassInset, width - jambW, height - glassInset]} stroke={subStroke} strokeWidth={subStrokeWidth} listening={false} />
          <Line points={[width * 0.5, 0, width * 0.5, height]} stroke={subStroke} strokeWidth={subStrokeWidth} dash={[4 / scale, 4 / scale]} listening={false} />
        </>;
      }
    }
  }

  const isRight = shape.swingHinge === 'right';
  const isOutside = shape.swingDirection === 'outside';
  const doorThickness = Math.min(openingW * 0.05, 38);

  const hitBg = <Rect width={width} height={height} fill="rgba(255,255,255,0.001)" strokeEnabled={false} />;

  switch (shape.doorType ?? 'single_door') {
    case 'double_door': {
      const leafW = openingW * 0.5;
      const leftHingeX = jambW;
      const rightHingeX = width - jambW;
      const swingY = isOutside ? 0 : height;
      const leafY = isOutside ? -leafW : height;

      return <>
        {hitBg}
        <Rect x={0} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={jambFill} />
        <Rect x={width - jambW} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={jambFill} />
        <Line points={[jambW, height * 0.5, width - jambW, height * 0.5]} stroke={arcStroke} strokeWidth={subStrokeWidth} dash={[6 / scale, 4 / scale]} listening={false} />
        {/* Left Leaf & Arc */}
        <Rect x={leftHingeX} y={leafY} width={doorThickness} height={leafW} stroke={stroke} strokeWidth={strokeWidth} fill={fill} listening={false} />
        <Arc x={leftHingeX} y={swingY} innerRadius={0} outerRadius={leafW} angle={90}
          rotation={isOutside ? 270 : 0} stroke={arcStroke} strokeWidth={subStrokeWidth} dash={[5 / scale, 4 / scale]} listening={false} />
        {/* Right Leaf & Arc */}
        <Rect x={rightHingeX - doorThickness} y={leafY} width={doorThickness} height={leafW} stroke={stroke} strokeWidth={strokeWidth} fill={fill} listening={false} />
        <Arc x={rightHingeX} y={swingY} innerRadius={0} outerRadius={leafW} angle={90}
          rotation={isOutside ? 180 : 90} stroke={arcStroke} strokeWidth={subStrokeWidth} dash={[5 / scale, 4 / scale]} listening={false} />
      </>;
    }

    case 'sliding_door': {
      const panelW = openingW * 0.55;
      const cy = height * 0.5;
      const panelH = Math.min(height * 0.35, 35);
      return <>
        {hitBg}
        <Rect x={0} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={jambFill} />
        <Rect x={width - jambW} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={jambFill} />
        <Line points={[jambW, cy, width - jambW, cy]} stroke={arcStroke} strokeWidth={subStrokeWidth} listening={false} />
        <Rect x={jambW} y={cy - panelH} width={panelW} height={panelH} stroke={stroke} strokeWidth={strokeWidth} fill={fill} listening={false} />
        <Rect x={width - jambW - panelW} y={cy} width={panelW} height={panelH} stroke={stroke} strokeWidth={strokeWidth} fill={fill} listening={false} />
        <Line points={[jambW + panelW * 0.4, cy - panelH * 0.5, jambW + panelW * 0.6, cy - panelH * 0.5]} stroke={subStroke} strokeWidth={Math.max(2 / scale, 1.8)} listening={false} />
        <Line points={[width - jambW - panelW * 0.6, cy + panelH * 0.5, width - jambW - panelW * 0.4, cy + panelH * 0.5]} stroke={subStroke} strokeWidth={Math.max(2 / scale, 1.8)} listening={false} />
      </>;
    }

    case 'bifold_door': {
      const panelW = openingW * 0.28;
      const swingY = isOutside ? -panelW * 0.7 : height + panelW * 0.7;
      return <>
        {hitBg}
        <Rect x={0} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={jambFill} />
        <Rect x={width - jambW} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={jambFill} />
        <Line points={[jambW, height * 0.5, width - jambW, height * 0.5]} stroke={arcStroke} strokeWidth={subStrokeWidth} dash={[6 / scale, 4 / scale]} listening={false} />
        {/* Left Bifold pair */}
        <Line points={[jambW, isOutside ? 0 : height, jambW + panelW * 0.8, swingY, jambW + 2 * panelW * 0.8, isOutside ? 0 : height]}
          stroke={stroke} strokeWidth={Math.max(2.5 / scale, 2)} listening={false} />
        {/* Right Bifold pair */}
        <Line points={[width - jambW, isOutside ? 0 : height, width - jambW - panelW * 0.8, swingY, width - jambW - 2 * panelW * 0.8, isOutside ? 0 : height]}
          stroke={stroke} strokeWidth={Math.max(2.5 / scale, 2)} listening={false} />
      </>;
    }

    case 'single_door':
    default: {
      const hingeX = isRight ? width - jambW : jambW;
      const leafX = isRight ? hingeX - doorThickness : hingeX;
      const leafY = isOutside ? -openingW : height;
      const swingY = isOutside ? 0 : height;
      const arcRotation = isRight ? (isOutside ? 180 : 90) : (isOutside ? 270 : 0);

      return <>
        {hitBg}
        <Rect x={0} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={jambFill} />
        <Rect x={width - jambW} y={0} width={jambW} height={height} stroke={stroke} strokeWidth={strokeWidth} fill={jambFill} />
        <Line points={[jambW, height * 0.5, width - jambW, height * 0.5]} stroke={arcStroke} strokeWidth={subStrokeWidth} dash={[6 / scale, 4 / scale]} listening={false} />
        <Rect x={leafX} y={leafY} width={doorThickness} height={openingW} stroke={stroke} strokeWidth={strokeWidth} fill={fill} listening={false} />
        <Arc x={hingeX} y={swingY} innerRadius={0} outerRadius={openingW} angle={90}
          rotation={arcRotation} stroke={arcStroke} strokeWidth={subStrokeWidth} dash={[5 / scale, 4 / scale]} listening={false} />
      </>;
    }
  }
}

function subFill(selected: boolean) {
  return selected ? '#dbeafe' : '#f1f5f9';
}
