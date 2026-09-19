import { useMemo } from 'react';
import { Group, Line, Text } from 'react-konva';
import { calculateProximityGuides, proximityBounds } from '../../domain/geometry';
import { useDrawingStore } from '../../store/useDrawingStore';
import { useEditorStore } from '../../store/useEditorStore';
import { formatMmToUnit } from '../../utils/units';

const suffix = { inches: 'in', feet: 'ft', millimeters: 'mm', meters: 'm' };

/** Ephemeral world-space measurements with constant screen-size labels and dashes. */
export function ProximityGuides() {
  const visible = useEditorStore(state => state.showProximityGuides);
  const dragged = useEditorStore(state => state.proximityShape);
  const selectedIds = useEditorStore(state => state.selectedIds);
  const scale = useEditorStore(state => state.scale);
  const unit = useEditorStore(state => state.displayUnit);
  const shapes = useDrawingStore(state => state.document.shapes);
  const guides = useMemo(() => visible && dragged && shapes.some(shape => shape.id === dragged.id)
    ? calculateProximityGuides(proximityBounds(dragged), shapes.filter(shape => !selectedIds.includes(shape.id)), dragged.id) : [], [visible, dragged, shapes, selectedIds]);

  return <Group listening={false} name="proximity-guides">
    {guides.map(guide => {
      const label = `${formatMmToUnit(guide.distanceMm, unit)} ${suffix[unit]}`;
      const labelWidth = (label.length * 8 + 16) / scale;
      return <Group key={guide.direction}>
        <Line points={[guide.start.x, guide.start.y, guide.end.x, guide.end.y]}
          stroke="#a855f7" strokeWidth={1.2 / scale} dash={[5 / scale, 4 / scale]} />
        <Text x={(guide.start.x + guide.end.x) / 2 - labelWidth / 2}
          y={(guide.start.y + guide.end.y) / 2 - 9 / scale}
          width={labelWidth} height={18 / scale} align="center" verticalAlign="middle"
          text={label} fontSize={12 / scale} fill="#7e22ce" stroke="#ffffff"
          strokeWidth={3 / scale} fillAfterStrokeEnabled />
      </Group>;
    })}
  </Group>;
}
