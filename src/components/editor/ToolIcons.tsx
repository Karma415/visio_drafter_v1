import type { SVGProps } from 'react';
import type { ActiveTool } from '../../store/useEditorStore';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function ToolIcon({ tool, size = 18, className = 'tool-icon', ...rest }: { tool: ActiveTool } & IconProps) {
  switch (tool) {
    case 'select':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <path d="m3 3 7 18 3-7 7-3L3 3Z" />
          <path d="m13 13 6 6" />
        </svg>
      );
    case 'line':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <circle cx="5" cy="19" r="2" fill="currentColor" />
          <circle cx="19" cy="5" r="2" fill="currentColor" />
          <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" />
        </svg>
      );
    case 'polyline':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <circle cx="4" cy="18" r="2" fill="currentColor" />
          <circle cx="12" cy="6" r="2" fill="currentColor" />
          <circle cx="20" cy="14" r="2" fill="currentColor" />
          <polyline points="5.5,17 11,7.5 18.5,13" />
        </svg>
      );
    case 'polygon':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <polygon points="12 3 21 9 18 20 6 20 3 9" />
        </svg>
      );
    case 'square':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      );
    case 'rectangle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="3" y="5" width="18" height="14" rx="1" />
        </svg>
      );
    case 'ellipse':
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} {...rest}><ellipse cx="12" cy="12" rx="10" ry="6" /></svg>;
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <polygon points="12 4 21 20 3 20" />
        </svg>
      );
    case 'arc':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <path d="M4 20 A 16 16 0 0 1 20 4" />
          <circle cx="4" cy="20" r="2" fill="currentColor" />
          <circle cx="20" cy="4" r="2" fill="currentColor" />
        </svg>
      );
    case 'wall':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="3" y="7" width="18" height="10" rx="1" />
          <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="3 2" />
          <line x1="9" y1="7" x2="9" y2="17" />
          <line x1="15" y1="7" x2="15" y2="17" />
        </svg>
      );
    case 'furniture':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <path d="M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5" />
          <path d="M3 11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Z" />
          <path d="M6 18v3" />
          <path d="M18 18v3" />
        </svg>
      );
    case 'measure':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="7" x2="3" y2="17" />
          <line x1="21" y1="7" x2="21" y2="17" />
          <polyline points="7 9 4 12 7 15" />
          <polyline points="17 9 20 12 17 15" />
        </svg>
      );
    case 'text':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="12" y1="4" x2="12" y2="20" />
          <line x1="9" y1="20" x2="15" y2="20" />
        </svg>
      );
    case 'door':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="3" y="19" width="3" height="3" fill="currentColor" />
          <rect x="18" y="19" width="3" height="3" fill="currentColor" />
          <line x1="6" y1="20.5" x2="6" y2="7" strokeWidth="2.5" />
          <path d="M6 7 A 13.5 13.5 0 0 1 19.5 20.5" strokeDasharray="3 2" />
        </svg>
      );
    case 'window':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="3" y="5" width="18" height="14" rx="1" />
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="1" y1="21" x2="23" y2="21" strokeWidth="2.5" />
        </svg>
      );
    default:
      return null;
  }
}
