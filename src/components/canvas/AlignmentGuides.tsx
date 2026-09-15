import { Line } from 'react-konva';
import type { AlignmentGuide, Point } from '../../domain/geometry';

interface Props {
  guides: AlignmentGuide[];
  scale: number;
  viewport: { position: Point; size: { width: number; height: number } };
}

/**
 * Renders temporary, non-interactive visual alignment guides across the canvas
 * while a shape is being dragged near other objects.
 */
export function AlignmentGuides({ guides, scale, viewport }: Props) {
  if (guides.length === 0) return null;

  const minX = -viewport.position.x / scale - 2000;
  const maxX = (viewport.size.width - viewport.position.x) / scale + 2000;
  const minY = -viewport.position.y / scale - 2000;
  const maxY = (viewport.size.height - viewport.position.y) / scale + 2000;

  const strokeWidth = Math.max(1.2 / scale, 1);
  const dash = [6 / scale, 6 / scale];

  return <>
    {guides.map((guide, index) => {
      const isVertical = guide.orientation === 'vertical';
      const points = isVertical
        ? [guide.position, minY, guide.position, maxY]
        : [minX, guide.position, maxX, guide.position];
      return <Line key={`${guide.orientation}:${guide.position}:${index}`}
        points={points} stroke="#0284c7" strokeWidth={strokeWidth}
        dash={dash} listening={false} />;
    })}
  </>;
}
