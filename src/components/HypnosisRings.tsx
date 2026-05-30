// HypnosisRings — futuristic SVG concentric rings.
//
// Two modes:
//   size (default 200) — embedded widget, e.g. used inside a card.
//   fullScreen         — rings fill the entire viewport; the SVG is sized
//                        to window.innerWidth × window.innerHeight so circles
//                        stay perfectly round regardless of aspect ratio.
//
// Visual design:
//   • 7 rings with iridescent linearGradient strokes
//   • Each ring scales inward + rotates → gradient sweeps as it shrinks (chrome shimmer)
//   • Burst/crack lines radiate from the glowing core
//   • Nebula core: layered radialGradient that pulses
//   • Focal dot at dead centre

interface Props {
  size?:       number;   // side length in px when not full-screen
  fullScreen?: boolean;  // cover entire viewport (position handled by parent)
}

const RING_COUNT = 7;
const ANIM_SECS  = 3.0;

// 7 iridescent gradient palettes
const RING_GRADS: [string, string, string][] = [
  ['#4fc3f7', '#7c4dff', '#e040fb'],
  ['#00e5ff', '#7c4dff', '#ff80ab'],
  ['#82b1ff', '#e040fb', '#ff8a50'],
  ['#b39ddb', '#00e5ff', '#69f0ae'],
  ['#e040fb', '#ff4081', '#40c4ff'],
  ['#69f0ae', '#40c4ff', '#7c4dff'],
  ['#ff80ab', '#b39ddb', '#00e5ff'],
];

// Primary burst lines (8) + micro-cracks (4)
const BURST_LINES = [
  { a: 0,   primary: true,  col: '#4fc3f7', dur: 2.0 },
  { a: 45,  primary: true,  col: '#7c4dff', dur: 2.2 },
  { a: 90,  primary: true,  col: '#e040fb', dur: 1.8 },
  { a: 135, primary: true,  col: '#00e5ff', dur: 2.1 },
  { a: 180, primary: true,  col: '#4fc3f7', dur: 1.9 },
  { a: 225, primary: true,  col: '#7c4dff', dur: 2.3 },
  { a: 270, primary: true,  col: '#e040fb', dur: 2.0 },
  { a: 315, primary: true,  col: '#00e5ff', dur: 1.85 },
  { a: 22,  primary: false, col: '#b39ddb', dur: 2.6 },
  { a: 112, primary: false, col: '#69f0ae', dur: 2.4 },
  { a: 202, primary: false, col: '#b39ddb', dur: 2.7 },
  { a: 292, primary: false, col: '#ff80ab', dur: 2.5 },
];

export default function HypnosisRings({ size = 200, fullScreen = false }: Props) {
  // ── Geometry ──────────────────────────────────────────────────────────────
  const W  = fullScreen ? window.innerWidth  : size;
  const H  = fullScreen ? window.innerHeight : size;
  const cx = W / 2;
  const cy = H / 2;
  // Ring starts at its outer edge; hypot ensures it reaches all four corners
  const r  = fullScreen ? Math.hypot(cx, cy) * 1.06 : size * 0.44;

  // Burst line lengths  (proportional to shorter viewport side when full-screen)
  const shortSide   = Math.min(W, H);
  const lineStartFr = fullScreen ? 0.05 : 0.05;
  const lineLenFr   = fullScreen ? 0.22 : 0.24;
  const lineStart   = shortSide * lineStartFr;
  const lineLen     = shortSide * lineLenFr;
  const coreR       = shortSide * (fullScreen ? 0.07 : 0.13);
  const dotR        = shortSide * (fullScreen ? 0.015 : 0.028);

  // Stroke widths — scale up proportionally for full-screen
  const ringStroke    = fullScreen ? Math.max(2.0, shortSide / 140) : 1.7;
  const primaryStroke = fullScreen ? Math.max(1.0, shortSide / 300) : 0.9;
  const microStroke   = fullScreen ? Math.max(0.6, shortSide / 500) : 0.5;

  return (
    <div
      className="hypno-wrap"
      style={{
        width:    fullScreen ? '100%' : size,
        height:   fullScreen ? '100%' : size,
        position: fullScreen ? 'absolute' : 'relative',
        inset:    fullScreen ? 0 : undefined,
      }}
    >
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-hidden="true"
        style={{
          display:  'block',
          position: fullScreen ? 'absolute' : 'static',
          inset:    fullScreen ? 0 : undefined,
          overflow: 'visible',     // allow rings to paint past SVG bounds
        }}
      >
        <defs>
          {RING_GRADS.map((g, i) => (
            <linearGradient
              key={i}
              id={`hg-${i}`}
              x1="0" y1="0"
              x2={W} y2={H}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%"   stopColor={g[0]} />
              <stop offset="50%"  stopColor={g[1]} />
              <stop offset="100%" stopColor={g[2]} />
            </linearGradient>
          ))}

          <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#e040fb" stopOpacity="1"   />
            <stop offset="35%"  stopColor="#7c4dff" stopOpacity="0.8" />
            <stop offset="70%"  stopColor="#00e5ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0"   />
          </radialGradient>

          <radialGradient id="dot-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="1"   />
            <stop offset="55%"  stopColor="#e040fb" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7c4dff" stopOpacity="0"   />
          </radialGradient>
        </defs>

        {/* ── Concentric rings ─────────────────────────── */}
        {Array.from({ length: RING_COUNT }, (_, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={`url(#hg-${i % RING_GRADS.length})`}
            strokeWidth={ringStroke}
            className="hypno-svg-ring"
            style={{
              animationDelay: `${-(i * ANIM_SECS / RING_COUNT).toFixed(3)}s`,
            }}
          />
        ))}

        {/* ── Energy burst lines ───────────────────────── */}
        {BURST_LINES.map(({ a, primary, col, dur }, i) => {
          const rad = (a * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={cx + Math.cos(rad) * lineStart}
              y1={cy + Math.sin(rad) * lineStart}
              x2={cx + Math.cos(rad) * (lineStart + lineLen * (primary ? 1 : 0.6))}
              y2={cy + Math.sin(rad) * (lineStart + lineLen * (primary ? 1 : 0.6))}
              stroke={col}
              strokeWidth={primary ? primaryStroke : microStroke}
              strokeLinecap="round"
              className="hypno-burst-line"
              style={{
                animationDelay:    `${(i * 0.14).toFixed(2)}s`,
                animationDuration: `${dur}s`,
              }}
            />
          );
        })}

        {/* ── Nebula core glow ─────────────────────────── */}
        <circle
          cx={cx} cy={cy}
          r={coreR}
          fill="url(#core-glow)"
          className="hypno-core-glow"
        />

        {/* ── Focal dot ────────────────────────────────── */}
        <circle
          cx={cx} cy={cy}
          r={dotR}
          fill="url(#dot-glow)"
          className="hypno-focal-dot"
        />
      </svg>
    </div>
  );
}
