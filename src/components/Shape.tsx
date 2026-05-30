import { useId } from 'react';
import type { ShapeName } from '../types';

interface Props {
  name:     ShapeName;
  size?:    number;
  animate?: boolean;  // dancing float — only for large feature shapes
}

export default function Shape({ name, size = 140, animate = false }: Props) {
  // useId: unique stable ID per component instance (avoids SVG gradient collisions
  // when multiple Shape instances appear in the results table simultaneously)
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const uid   = `ic${rawId}`;

  return (
    <div
      className={`shape-root${animate ? ' shape-animated' : ''}`}
      style={{ width: size, height: size }}
    >
      {animate && <div className="shape-aura" />}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ display: 'block', overflow: 'visible' }}
        aria-hidden="true"
      >
        {render(name, uid)}
      </svg>
    </div>
  );
}

// ── Shape renderers — soft ceramic / glass palette ────────────────────────────
//
// Palette:
//   #ffffff / #f5f5f7  — specular white
//   #e8e8ea / #d1d1d6  — light ceramic surface
//   #c7c7cc / #aeaeb2  — mid ceramic
//   #8e8e93 / #636366  — deep shadow
//
// Each shape uses radial/linear gradients to create a subtle 3D form,
// consistent with Apple's ceramic and frosted-glass UI objects.

function render(name: ShapeName, id: string) {
  switch (name) {

    case 'circle':
      return (
        <>
          <defs>
            <radialGradient id={`${id}-a`} cx="36%" cy="30%" r="65%">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="38%"  stopColor="#d1d1d6" />
              <stop offset="100%" stopColor="#8e8e93" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill={`url(#${id}-a)`} />
          {/* Specular highlight — top-left light source */}
          <ellipse cx="36" cy="31" rx="12" ry="7.5" fill="rgba(255,255,255,0.65)" />
          {/* Subtle bottom rim shadow */}
          <ellipse cx="63" cy="67" rx="5" ry="3.5" fill="rgba(0,0,0,0.07)" />
        </>
      );

    case 'square':
      return (
        <>
          <defs>
            <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#f5f5f7" />
              <stop offset="55%"  stopColor="#d1d1d6" />
              <stop offset="100%" stopColor="#a0a0a5" />
            </linearGradient>
          </defs>
          {/* Top face — lit, lightest */}
          <polygon points="20,16 80,16 86,22 26,22" fill="#e8e8ea" />
          {/* Right face — in shadow */}
          <polygon points="80,16 80,80 86,86 86,22" fill="#aeaeb2" />
          {/* Front face with gradient */}
          <rect x="20" y="22" width="60" height="58" rx="2" fill={`url(#${id}-a)`} />
          {/* Top-edge gloss strip */}
          <rect x="20" y="22" width="60" height="8" rx="2" fill="rgba(255,255,255,0.30)" />
        </>
      );

    case 'triangle':
      return (
        <>
          <defs>
            {/* Lit left face: near-white top → mid-ceramic bottom */}
            <linearGradient id={`${id}-a`} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%"   stopColor="#f5f5f7" />
              <stop offset="100%" stopColor="#c7c7cc" />
            </linearGradient>
            {/* Shadow right face: slightly darker */}
            <linearGradient id={`${id}-b`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#a0a0a5" />
              <stop offset="100%" stopColor="#8e8e93" />
            </linearGradient>
          </defs>
          {/* Shadow right face */}
          <polygon points="50,8 92,88 50,68" fill={`url(#${id}-b)`} />
          {/* Lit left face */}
          <polygon points="50,8 8,88 50,68"  fill={`url(#${id}-a)`} />
          {/* Apex edge highlight */}
          <line x1="50" y1="8" x2="29" y2="48"
                stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" />
        </>
      );

    case 'diamond':
      return (
        <>
          <defs>
            {/* Upper-right: lit */}
            <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="40%"  stopColor="#d1d1d6" />
              <stop offset="100%" stopColor="#aeaeb2" />
            </linearGradient>
            {/* Lower-right: in shadow */}
            <linearGradient id={`${id}-b`} x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#8e8e93" />
              <stop offset="100%" stopColor="#636366" />
            </linearGradient>
          </defs>
          {/* Upper-right facet — lit */}
          <polygon points="50,5 93,48 50,50"  fill={`url(#${id}-a)`} />
          {/* Upper-left facet — soft lit */}
          <polygon points="50,5 7,48 50,50"   fill="rgba(235,235,238,0.90)" />
          {/* Lower-right facet — shadow */}
          <polygon points="93,48 50,95 50,50" fill={`url(#${id}-b)`} />
          {/* Lower-left facet — deepest shadow */}
          <polygon points="7,48 50,95 50,50"  fill="rgba(80,80,84,0.88)" />
          {/* Girdle edge */}
          <line x1="7" y1="48" x2="93" y2="48"
                stroke="rgba(255,255,255,0.40)" strokeWidth="1" />
        </>
      );

    case 'ring':
      return (
        <>
          <defs>
            <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#e8e8ea" />
              <stop offset="55%"  stopColor="#c7c7cc" />
              <stop offset="100%" stopColor="#8e8e93" />
            </linearGradient>
          </defs>
          {/* Ambient shadow ring (slightly offset for depth) */}
          <circle cx="51.5" cy="51.5" r="36" fill="none"
                  stroke="rgba(0,0,0,0.11)" strokeWidth="17" />
          {/* Main ceramic ring */}
          <circle cx="50" cy="50" r="36" fill="none"
                  stroke={`url(#${id}-a)`} strokeWidth="14" />
          {/* Top specular arc */}
          <path d="M 22,34 A 36,36 0 0 1 78,34"
                fill="none" stroke="rgba(255,255,255,0.55)"
                strokeWidth="4" strokeLinecap="round" />
        </>
      );

    case 'blob':
      return (
        <>
          <defs>
            <radialGradient id={`${id}-a`} cx="40%" cy="36%" r="62%">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="45%"  stopColor="#d1d1d6" />
              <stop offset="100%" stopColor="#aeaeb2" />
            </radialGradient>
          </defs>
          {/* Organic outline */}
          <path
            d="M 50,12 C 70,6 92,26 90,50 C 88,74 68,94 46,90 C 24,86 6,68 10,44 C 14,20 30,18 50,12 Z"
            fill={`url(#${id}-a)`}
          />
          {/* Specular highlight */}
          <ellipse cx="38" cy="30" rx="13" ry="8"  fill="rgba(255,255,255,0.65)" />
          {/* Bottom shadow dimple */}
          <ellipse cx="62" cy="68" rx="7"  ry="4.5" fill="rgba(0,0,0,0.06)" />
        </>
      );

    default:
      return null;
  }
}
