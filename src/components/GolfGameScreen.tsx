import { useState, useEffect, useRef } from 'react';
import type { GolfCourse, GolfWall } from '../types';

// ── Physics constants ─────────────────────────────────────────────────────────
const VW         = 600;
const VH         = 900;
const BALL_R     = 14;
const HOLE_R     = 18;
const FRICTION   = 0.982;
const BOUNCE     = 0.86;   // slightly more elastic than before
const MAX_SPEED  = 18;
const MAX_DRAG   = 140;
const BALL_TAP_R = 50;

// ── Course inner boundaries (green surface rect: x=30,y=44,w=540,h=830) ──────
const COURSE_L = 30 + BALL_R + 1;   // left wall inner edge
const COURSE_R = 570 - BALL_R - 1;  // right wall inner edge
const COURSE_T = 44  + BALL_R + 1;  // top wall inner edge
const COURSE_B = 874 - BALL_R - 1;  // bottom wall inner edge

type Phase = 'idle' | 'aiming' | 'rolling' | 'sunk';

// ── Wall collision ────────────────────────────────────────────────────────────

function closestPointOnSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return { x: x1 + t * dx, y: y1 + t * dy };
}

function resolveWall(bx: number, by: number, vx: number, vy: number, wall: GolfWall) {
  const cp  = closestPointOnSeg(bx, by, wall.x1, wall.y1, wall.x2, wall.y2);
  const ddx = bx - cp.x, ddy = by - cp.y;
  const dist = Math.sqrt(ddx * ddx + ddy * ddy);
  const WALL_RADIUS = BALL_R + 7;   // half of the 14-px visual wall + ball radius
  if (dist < WALL_RADIUS && dist > 0.01) {
    const nx = ddx / dist, ny = ddy / dist;
    // Push ball fully outside the wall surface
    bx = cp.x + nx * (WALL_RADIUS + 0.5);
    by = cp.y + ny * (WALL_RADIUS + 0.5);
    const dot = vx * nx + vy * ny;
    if (dot < 0) { vx = (vx - 2 * dot * nx) * BOUNCE; vy = (vy - 2 * dot * ny) * BOUNCE; }
  }
  return { x: bx, y: by, vx, vy };
}

// ── Course-border bounce (replaces raw viewBox clamp) ───────────────────────
function resolveBorder(
  x: number, y: number, vx: number, vy: number,
): { x: number; y: number; vx: number; vy: number } {
  if (x < COURSE_L) { x = COURSE_L; if (vx < 0) vx = -vx * BOUNCE; }
  if (x > COURSE_R) { x = COURSE_R; if (vx > 0) vx = -vx * BOUNCE; }
  if (y < COURSE_T) { y = COURSE_T; if (vy < 0) vy = -vy * BOUNCE; }
  if (y > COURSE_B) { y = COURSE_B; if (vy > 0) vy = -vy * BOUNCE; }
  return { x, y, vx, vy };
}

// ── Aim indicator ─────────────────────────────────────────────────────────────

function AimIndicator({ bx, by, ax, ay }: { bx: number; by: number; ax: number; ay: number }) {
  const dx = ax - bx, dy = ay - by;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 4) return null;
  const power = Math.min(dist, MAX_DRAG) / MAX_DRAG;
  const nx = -dx / dist, ny = -dy / dist;
  const len = power * 170;
  return (
    <>
      <circle cx={bx} cy={by} r={BALL_R + 6 + power * 22}
        fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeDasharray="5 4" />
      <line x1={bx} y1={by} x2={bx + nx * len} y2={by + ny * len}
        stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" strokeDasharray="11 7" strokeLinecap="round" />
      <circle cx={bx + nx * len} cy={by + ny * len} r={5} fill="rgba(255,255,255,0.55)" />
    </>
  );
}

// ── KRONE hole-in-one overlay ────────────────────────────────────────────────
function KroneOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="golf-krone-overlay" aria-live="assertive">
      <span className="golf-krone-text">KRONE</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  course:      GolfCourse;
  courseIndex: number;
  onComplete:  (shots: number) => void;
  onHome:      () => void;
}

export default function GolfGameScreen({ course, courseIndex, onComplete, onHome }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const ballRef       = useRef({ x: course.ballStart.x, y: course.ballStart.y, vx: 0, vy: 0 });
  const phaseRef      = useRef<Phase>('idle');
  const shotsRef      = useRef(0);
  const sunkRef       = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [ballPos,    setBallPos]  = useState(course.ballStart);
  const [shots,      setShots]    = useState(0);
  const [phase,      setPhase]    = useState<Phase>('idle');
  const [showKrone,  setShowKrone] = useState(false);

  const aimCurrentRef = useRef<{ x: number; y: number } | null>(null);
  const [aimDisplay,  setAimDisplay] = useState<{ x: number; y: number } | null>(null);

  // ── Physics loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    let animId: number;

    function tick() {
      animId = requestAnimationFrame(tick);
      if (phaseRef.current !== 'rolling') return;

      let { x, y, vx, vy } = ballRef.current;

      // ── Substep simulation — prevents tunneling at high speeds ──────────────
      const speed  = Math.hypot(vx, vy);
      const steps  = speed > 10 ? 4 : speed > 6 ? 2 : 1;
      const invSteps = 1 / steps;

      for (let s = 0; s < steps; s++) {
        // Friction per sub-frame
        const subFriction = Math.pow(FRICTION, invSteps);
        vx *= subFriction; vy *= subFriction;
        x  += vx * invSteps;
        y  += vy * invSteps;

        // Course border bounce — uses actual green rect, not full viewBox
        const b = resolveBorder(x, y, vx, vy);
        x = b.x; y = b.y; vx = b.vx; vy = b.vy;

        // Wall bounce
        for (const wall of course.walls) {
          const r = resolveWall(x, y, vx, vy, wall);
          x = r.x; y = r.y; vx = r.vx; vy = r.vy;
        }

        // Hole detection
        if (!sunkRef.current) {
          const d = Math.hypot(x - course.hole.x, y - course.hole.y);
          if (d < BALL_R + HOLE_R * 0.58) {
            sunkRef.current = true;
            ballRef.current = { x: course.hole.x, y: course.hole.y, vx: 0, vy: 0 };
            setBallPos({ x: course.hole.x, y: course.hole.y });
            phaseRef.current = 'sunk';
            setPhase('sunk');
            const finalShots = shotsRef.current;
            if (finalShots === 1) {
              setShowKrone(true);
              setTimeout(() => { setShowKrone(false); onCompleteRef.current(finalShots); }, 1800);
            } else {
              setTimeout(() => onCompleteRef.current(finalShots), 700);
            }
            return;
          }
        }
      }

      ballRef.current = { x, y, vx, vy };
      setBallPos({ x, y });

      const finalSpeed = Math.hypot(vx, vy);
      if (finalSpeed < 0.35) {
        ballRef.current = { x, y, vx: 0, vy: 0 };
        phaseRef.current = 'idle';
        setPhase('idle');
      }
    }

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ── SVG coords ────────────────────────────────────────────────────────────
  function toSVGPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const sp = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: sp.x, y: sp.y };
  }

  // ── Pointer handlers ──────────────────────────────────────────────────────
  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (phaseRef.current !== 'idle') return;
    const pt = toSVGPoint(e.clientX, e.clientY);
    if (!pt) return;
    const b = ballRef.current;
    if (Math.hypot(pt.x - b.x, pt.y - b.y) > BALL_TAP_R) return;
    phaseRef.current = 'aiming';
    setPhase('aiming');
    aimCurrentRef.current = { x: b.x, y: b.y };
    setAimDisplay({ x: b.x, y: b.y });
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (phaseRef.current !== 'aiming') return;
    const pt = toSVGPoint(e.clientX, e.clientY);
    if (!pt) return;
    aimCurrentRef.current = pt;
    setAimDisplay(pt);
  }

  function handlePointerUp() {
    if (phaseRef.current !== 'aiming') return;
    const current = aimCurrentRef.current;
    const b = ballRef.current;
    if (!current) { phaseRef.current = 'idle'; setPhase('idle'); return; }

    const dx = current.x - b.x, dy = current.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    aimCurrentRef.current = null;
    setAimDisplay(null);

    if (dist < 6) { phaseRef.current = 'idle'; setPhase('idle'); return; }

    const power = Math.min(dist, MAX_DRAG) / MAX_DRAG;
    const speed = power * MAX_SPEED;
    ballRef.current = { ...b, vx: (-dx / dist) * speed, vy: (-dy / dist) * speed };

    const newShots = shotsRef.current + 1;
    shotsRef.current = newShots;
    setShots(newShots);
    phaseRef.current = 'rolling';
    setPhase('rolling');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const holeCX = course.hole.x;
  const holeCY = course.hole.y;

  return (
    <div className="golf-game-wrap">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="golf-game-header overlay-light-text">
        <button className="color-overlay-btn" onClick={onHome}
          aria-label="Back to home" style={{ pointerEvents: 'auto' }}>
          ← Home
        </button>
        <div className="golf-header-info">
          <span>Course {courseIndex + 1} / 5</span>
          <br />
          <span style={{ color: 'rgba(255,255,255,0.50)', fontWeight: 500 }}>
            {course.name}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="golf-header-shots" key={shots}>{shots}</span>
          <span className="golf-shots-label">shots · par {course.par}</span>
        </div>
      </div>

      {/* ── SVG field ───────────────────────────────────────────────────────── */}
      <div className="golf-game-field">
        <svg
          ref={svgRef}
          className="golf-game-svg"
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            <radialGradient id="ballGrad" cx="35%" cy="28%" r="65%">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="50%"  stopColor="#e8e8f5" />
              <stop offset="100%" stopColor="#c0c0d8" />
            </radialGradient>
            <radialGradient id="holeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#050805" />
              <stop offset="100%" stopColor="#020402" />
            </radialGradient>
            <radialGradient id="courseGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(40,100,48,0.35)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <filter id="wallShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.45)" />
            </filter>
          </defs>

          {/* Outer background */}
          <rect x="0" y="0" width={VW} height={VH} fill="#14151A" />

          {/* Course drop shadow */}
          <rect x="36" y="50" width={VW - 64} height={VH - 82}
            fill="rgba(0,0,0,0.55)" rx="16" />

          {/* Green course surface */}
          <rect x="30" y="44" width={VW - 60} height={VH - 70}
            fill="#1A5228" rx="14" />

          {/* Course surface texture — subtle grid dots */}
          {Array.from({ length: 5 }, (_, col) =>
            Array.from({ length: 9 }, (_, row) => (
              <circle key={`${col}-${row}`}
                cx={30 + (col + 0.5) * ((VW - 60) / 5)}
                cy={44 + (row + 0.5) * ((VH - 70) / 9)}
                r={1.8} fill="rgba(255,255,255,0.035)" />
            ))
          )}

          {/* Inner surface glow */}
          <rect x="30" y="44" width={VW - 60} height={VH - 70}
            fill="url(#courseGlow)" rx="14" />

          {/* White course border — thick so collision and visual match */}
          <rect x="30" y="44" width={VW - 60} height={VH - 70}
            fill="none" stroke="rgba(255,255,255,0.96)" strokeWidth="14" rx="14" />

          {/* Inner border accent (thin dark line) */}
          <rect x="36" y="50" width={VW - 72} height={VH - 82}
            fill="none" stroke="rgba(0,0,0,0.20)" strokeWidth="1.5" rx="11" />

          {/* Walls — shadow + body + highlight */}
          {course.walls.map((w, i) => (
            <g key={i}>
              {/* Shadow layer */}
              <line x1={w.x1 + 3} y1={w.y1 + 4} x2={w.x2 + 3} y2={w.y2 + 4}
                stroke="rgba(0,0,0,0.40)" strokeWidth="18" strokeLinecap="round" />
              {/* Body */}
              <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                stroke="rgba(255,255,255,0.94)" strokeWidth="13" strokeLinecap="round" />
              {/* Top highlight */}
              <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                stroke="rgba(255,255,255,0.45)" strokeWidth="4" strokeLinecap="round" />
            </g>
          ))}

          {/* Hole — shadow + body + glow ring + flag */}
          <circle cx={holeCX + 2} cy={holeCY + 3} r={HOLE_R + 3}
            fill="rgba(0,0,0,0.38)" />
          <circle cx={holeCX} cy={holeCY} r={HOLE_R + 9}
            fill="none" stroke="rgba(48,209,88,0.14)" strokeWidth="7" />
          <circle cx={holeCX} cy={holeCY} r={HOLE_R}
            fill="url(#holeGrad)" stroke="rgba(255,255,255,0.60)" strokeWidth="2" />
          {/* Cup inner shadow */}
          <circle cx={holeCX - 2} cy={holeCY - 2} r={HOLE_R * 0.55}
            fill="rgba(0,0,0,0.28)" />
          <line x1={holeCX} y1={holeCY - HOLE_R}
            x2={holeCX} y2={holeCY - HOLE_R - 36}
            stroke="rgba(255,255,255,0.78)" strokeWidth="2.5" strokeLinecap="round" />
          <polygon
            points={`${holeCX},${holeCY - HOLE_R - 36} ${holeCX + 22},${holeCY - HOLE_R - 26} ${holeCX},${holeCY - HOLE_R - 16}`}
            fill="rgba(48,209,88,0.92)" />

          {/* Start marker */}
          {shots === 0 && phase === 'idle' && (
            <circle cx={course.ballStart.x} cy={course.ballStart.y}
              r={BALL_R + 4} fill="none"
              stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="5 4" />
          )}

          {/* Aim indicator */}
          {phase === 'aiming' && aimDisplay && (
            <AimIndicator bx={ballPos.x} by={ballPos.y} ax={aimDisplay.x} ay={aimDisplay.y} />
          )}

          {/* Ball */}
          {phase !== 'sunk' && (
            <>
              <ellipse cx={ballPos.x + 2} cy={ballPos.y + 5}
                rx={BALL_R * 0.85} ry={BALL_R * 0.40} fill="rgba(0,0,0,0.40)" />
              <circle cx={ballPos.x} cy={ballPos.y} r={BALL_R}
                fill="url(#ballGrad)"
                stroke="rgba(255,255,255,0.30)" strokeWidth="1" />
              {/* KRONE branding */}
              <text
                x={ballPos.x}
                y={ballPos.y + 2.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="5.0"
                fontWeight="700"
                fontFamily="-apple-system,'Helvetica Neue',sans-serif"
                fill="rgba(50,45,75,0.70)"
                letterSpacing="0.55"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >KRONE</text>
            </>
          )}

          {/* Sunk animation */}
          {phase === 'sunk' && (
            <circle cx={ballPos.x} cy={ballPos.y} r={BALL_R}
              fill="rgba(255,255,255,0.90)" className="golf-ball-sinking" />
          )}
        </svg>

        {/* Aim hint */}
        <div className="golf-aim-hint">
          {phase === 'idle' && 'Drag ball to aim · release to shoot'}
        </div>
      </div>

      {/* KRONE hole-in-one overlay */}
      <KroneOverlay active={showKrone} />
    </div>
  );
}
