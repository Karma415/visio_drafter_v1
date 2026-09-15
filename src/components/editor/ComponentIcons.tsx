import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Architectural 2D Top-Down Door Symbol:
 * Wall jambs, dashed threshold, quarter-circle swing arc, and open door leaf.
 */
export function DoorIcon({ size = 32, className = 'component-icon', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" stroke="currentColor" className={className} {...rest}>
      {/* Wall Jamb Left */}
      <rect x="4" y="10" width="5" height="8" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" />
      {/* Wall Jamb Right */}
      <rect x="35" y="10" width="5" height="8" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" />
      {/* Dashed Threshold Line */}
      <line x1="9" y1="14" x2="35" y2="14" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.6" />
      {/* Door Swing Arc */}
      <path d="M 35 14 A 26 26 0 0 1 9 40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3.5 2.5" opacity="0.75" />
      {/* Open Door Leaf */}
      <line x1="9" y1="14" x2="9" y2="38" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Architectural 2D Top-Down Window Symbol:
 * Thick wall cutout, left/right jambs, outer sill, and 2 middle glass pane lines.
 */
export function WindowIcon({ size = 32, className = 'component-icon', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" stroke="currentColor" className={className} {...rest}>
      {/* Outer Window Sill */}
      <rect x="2" y="27" width="40" height="3" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.2" rx="1" />
      {/* Wall Cutout Box */}
      <rect x="4" y="13" width="36" height="14" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.08" />
      {/* Wall Jamb Left */}
      <rect x="4" y="13" width="5" height="14" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.2" />
      {/* Wall Jamb Right */}
      <rect x="35" y="13" width="5" height="14" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.2" />
      {/* Middle Glass Panes (2 thin lines) */}
      <line x1="9" y1="17.5" x2="35" y2="17.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="9" y1="22.5" x2="35" y2="22.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Architectural 2D Top-Down Cased Opening Symbol:
 * Wall jamb blocks with open walkthrough and subtle dashed threshold.
 */
export function OpeningIcon({ size = 32, className = 'component-icon', ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" stroke="currentColor" className={className} {...rest}>
      {/* Wall Jamb Left */}
      <rect x="4" y="13" width="6" height="14" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.5" />
      {/* Wall Jamb Right */}
      <rect x="34" y="13" width="6" height="14" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.5" />
      {/* Opening Edges */}
      <line x1="10" y1="13" x2="34" y2="13" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.6" />
      <line x1="10" y1="27" x2="34" y2="27" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.6" />
      {/* Center Opening Guide */}
      <line x1="10" y1="20" x2="34" y2="20" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
    </svg>
  );
}
