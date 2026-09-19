import type { SVGProps } from 'react';
import type { FurnitureKind } from '../../domain/furniture';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export function FurnitureIcon({ kind, size = 32, className = 'component-icon', ...rest }: { kind: FurnitureKind } & IconProps) {
  // A distinct, simple SVG path for each furniture type for the library sidebar
  switch (kind) {
    case 'sofa':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
          <rect x="2" y="11" width="20" height="7" rx="2" />
          <line x1="8" y1="11" x2="8" y2="18" />
          <line x1="16" y1="11" x2="16" y2="18" />
        </svg>
      );
    case 'bed':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M4 10h16" />
          <rect x="7" y="5" width="4" height="3" rx="1" />
          <rect x="13" y="5" width="4" height="3" rx="1" />
        </svg>
      );
    case 'table':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <rect x="6" y="9" width="12" height="6" rx="1" />
        </svg>
      );
    case 'chair':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M6 10h12" />
        </svg>
      );
    case 'desk':
    case 'l_desk':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="3" y="5" width="18" height="14" rx="1" />
          <rect x="13" y="5" width="8" height="14" rx="1" />
        </svg>
      );
    case 'dresser':
    case 'console_table':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="3" y="7" width="18" height="10" rx="1" />
          <line x1="12" y1="7" x2="12" y2="17" />
          <line x1="7.5" y1="12" x2="16.5" y2="12" />
        </svg>
      );
    case 'floor_cabinet':
    case 'wall_cabinet':
    case 'tall_cabinet':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="4" y="4" width="16" height="16" />
          <line x1="4" y1="4" x2="20" y2="20" />
          <line x1="4" y1="20" x2="20" y2="4" />
        </svg>
      );
    case 'bookshelf':
    case 'wall_shelf':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="3" y="4" width="18" height="16" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="14" x2="21" y2="14" />
        </svg>
      );
    case 'tv_unit':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="3" y="10" width="18" height="4" rx="1" />
          <rect x="9" y="7" width="6" height="3" />
        </svg>
      );
    case 'refrigerator':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="5" y="4" width="14" height="16" rx="1" />
          <line x1="5" y1="17" x2="19" y2="17" />
          <line x1="12" y1="17" x2="12" y2="20" />
        </svg>
      );
    case 'stove':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="4" y="4" width="16" height="16" rx="1" />
          <circle cx="9" cy="10" r="2" />
          <circle cx="15" cy="10" r="2" />
          <circle cx="9" cy="16" r="2" />
          <circle cx="15" cy="16" r="2" />
        </svg>
      );
    case 'washer_dryer':
    case 'dishwasher':
    case 'countertop_dishwasher':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="4" y="4" width="16" height="16" rx="1" />
          <circle cx="12" cy="13" r="5" />
          <line x1="4" y1="7" x2="20" y2="7" />
        </svg>
      );
    case 'kitchen_sink':
    case 'bathroom_vanity':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="3" y="6" width="18" height="12" rx="1" />
          <rect x="6" y="9" width="12" height="6" rx="2" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
    case 'toilet':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="7" y="4" width="10" height="6" rx="1" />
          <ellipse cx="12" cy="16" rx="4" ry="5" />
        </svg>
      );
    case 'bathtub':
    case 'shower':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <circle cx="20" cy="12" r="1" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
          <rect x="4" y="4" width="16" height="16" rx="1" />
        </svg>
      );
  }
}
