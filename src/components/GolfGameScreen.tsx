import { useState, useEffect, useRef } from 'react';
import type { GolfCourse, GolfWall } from '../types';

const RAD_TO_DEG = 180 / Math.PI;

// ── Debug mode ────────────────────────────────────────────────────────────────
// Add ?debugGolfAim to the URL to enable the aim debug overlay.
// e.g.  http://localhost:5173/?debugGolfAim
// Remove or set to false before shipping.
const GOLF_AIM_DEBUG = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('debugGolfAim');

interface DbgState {
  phase: string;
  bWX: number; bWY: number;      // ball world (SVG) position
  bSX: number; bSY: number;      // ball screen position (calculated from snapshot)
  pSX: number; pSY: number;      // raw pointer screen clientX/Y
  pWX: number; pWY: number;      // pointer world (after screenToCoursePoint)
  aWX: number; aWY: number;      // aim anchor world position
  proximity: number;              // screen-px distance: touch → ball
  accepted: boolean;              // proximity ≤ BALL_TAP_PX
  dragX: number; dragY: number;  // drag vector SVG units
  shotX: number; shotY: number;  // shot vector SVG units
  dragDist: number;
  power: number;
  snapCS:  number;                // contentScale at pointer-down
  snapOX: number; snapOY: number;// letterbox offsets at pointer-down
  rectW: number;  rectH: number; // raw SVG element rect size at pointer-down
  ptId: number | null;
  aimScaleAtDown: number;        // CSS zoom value when pointer-down fired
}
const DBG0: DbgState = {
  phase: 'idle', bWX: 0, bWY: 0, bSX: 0, bSY: 0,
  pSX: 0, pSY: 0, pWX: 0, pWY: 0, aWX: 0, aWY: 0,
  proximity: 999, accepted: false,
  dragX: 0, dragY: 0, shotX: 0, shotY: 0,
  dragDist: 0, power: 0,
  snapCS: 0, snapOX: 0, snapOY: 0,
  rectW: 0, rectH: 0,
  ptId: null, aimScaleAtDown: 1,
};

// ── Physics constants ─────────────────────────────────────────────────────────
const VW         = 600;
const VH         = 900;
const BALL_R     = 14;
const HOLE_R     = 18;
const FRICTION   = 0.982;
const BOUNCE     = 0.86;   // slightly more elastic than before
const MAX_SPEED  = 18;
const MAX_DRAG   = 140;
// ── Aiming constants ─────────────────────────────────────────────────────────
// MIN_DRAG: SVG-unit deadzone.  At contentScale ≈ 0.65, 22 SVG px ≈ 14 screen px —
// above touch-jitter threshold (5–10 px) so stray taps never fire a shot.
const MIN_DRAG     = 22;
// BALL_TAP_PX: screen-space tolerance for "tap on ball".  Only finger-downs
// within this radius of the ball's screen position enter aim mode; anywhere
// else is ignored (no accidental aim from touching empty course space).
// 60 px ≈ 1.6 cm on most phones — generous enough for chunky thumbs.
const BALL_TAP_PX  = 60;
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

// ── Aim camera params ─────────────────────────────────────────────────────────
//
// Called once when the player starts aiming.  Returns the ideal zoom scale and
// CSS transform-origin (as percentages) for the current ball position.
//
// Strategy:
//  • Base aim scale is 0.78 — noticeably tighter zoom than the old 0.86.
//  • When the ball is within ~18 % of any course edge, scale drops further to
//    0.68 so the player has a larger drag region.
//  • The transform-origin is shifted *away* from the edge the ball is near.
//    This means the zoomed-out view expands toward the edge, giving the player
//    the most possible physical drag room in exactly the direction they need it.
//  • At scale = 1 (after shot release) the origin has zero visual effect, so we
//    intentionally do NOT reset it on release — changing the origin during the
//    scale-back animation would cause an ugly drift/jump.

interface AimParams { scale: number; originX: number; originY: number }

function computeAimParams(bx: number, by: number): AimParams {
  const courseW = COURSE_R - COURSE_L;  // 510
  const courseH = COURSE_B - COURSE_T;  // 800
  const margin  = 0.18;                 // 18 % edge zone

  const nearLeft   = bx < COURSE_L + courseW * margin;
  const nearRight  = bx > COURSE_R - courseW * margin;
  const nearTop    = by < COURSE_T + courseH * margin;
  const nearBottom = by > COURSE_B - courseH * margin;
  const edgeCount  = (nearLeft ? 1 : 0) + (nearRight ? 1 : 0) +
                     (nearTop  ? 1 : 0) + (nearBottom ? 1 : 0);
  const nearCorner = edgeCount >= 2;   // two simultaneous edges = corner
  const nearEdge   = edgeCount >= 1;

  // Corner: extra zoom-out so the player still has a usable drag region
  const scale = nearCorner ? 0.56 : nearEdge ? 0.62 : 0.75;

  // Express ball position as 0–100 % of the SVG viewBox dimensions
  const ballXPct = (bx / VW) * 100;
  const ballYPct = (by / VH) * 100;

  // Shift the origin in the OPPOSITE direction to the edge the ball is near.
  // Formula: 50 + (50 − ballPct) × shiftFactor
  //   ball at 7.5 % (near left)  → +ve shift → origin moves right (gives more room on left)
  //   ball at 92.5 % (near right) → −ve shift → origin moves left  (gives more room on right)
  const shift   = nearEdge ? 0.38 : 0.18;
  const originX = Math.max(20, Math.min(80, 50 + (50 - ballXPct) * shift));
  const originY = Math.max(20, Math.min(80, 50 + (50 - ballYPct) * shift));

  return { scale, originX, originY };
}

// ── Aim indicator ─────────────────────────────────────────────────────────────

// bx/by  — ball centre (ring anchor + arrow start)
// anchorX/Y — where the player first touched
// currentX/Y — current pointer position
// Direction = anchorX/Y → currentX/Y ; shot fires in the OPPOSITE direction.
// Deadzone uses the anchor→current distance, not ball→pointer, so the first
// touch never produces an instant wrong-direction aim.
function AimIndicator({
  bx, by,
  anchorX, anchorY,
  currentX, currentY,
}: {
  bx: number; by: number;
  anchorX: number; anchorY: number;
  currentX: number; currentY: number;
}) {
  const dx = currentX - anchorX, dy = currentY - anchorY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < MIN_DRAG) return null;              // MIN_DRAG SVG-unit deadzone
  const power = Math.min(dist, MAX_DRAG) / MAX_DRAG;
  const nx = -dx / dist, ny = -dy / dist;        // opposite of drag direction
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

const AUDIO_STORAGE_KEY = 'innerclock_music_on';

export default function GolfGameScreen({ course, courseIndex, onComplete, onHome }: Props) {
  const svgRef  = useRef<SVGSVGElement>(null);

  // Coordinate snapshot captured at pointer-down, BEFORE the CSS zoom animation
  // fires.  getBoundingClientRect() always returns correct screen-space values
  // even with CSS transforms on ancestor elements (unlike getScreenCTM() which
  // has known cross-browser gaps when HTML ancestors carry CSS transforms).
  // Storing the pre-zoom snapshot means every screenToCoursePoint() call during
  // the gesture uses the same mapping regardless of zoom animation progress.
  const snapRef = useRef<{
    left:         number;
    top:          number;
    contentScale: number;   // min(elemW/VW, elemH/VH) — uniform SVG scale factor
    offsetX:      number;   // horizontal letterbox padding (preserveAspectRatio)
    offsetY:      number;   // vertical letterbox padding
  } | null>(null);

  const ballRef       = useRef({ x: course.ballStart.x, y: course.ballStart.y, vx: 0, vy: 0 });
  const phaseRef      = useRef<Phase>('idle');
  const shotsRef      = useRef(0);
  const sunkRef       = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ── Audio ─────────────────────────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);
  function getAudioCtx(): AudioContext | null {
    if (localStorage.getItem(AUDIO_STORAGE_KEY) === 'false') return null;
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext ?? (window as any).webkitAudioContext)();
      } catch { return null; }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }
  function playGolfSwing(power: number) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const bufLen = Math.floor(ctx.sampleRate * 0.18);
      const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data   = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
      }
      const src    = ctx.createBufferSource();
      src.buffer   = buf;
      const filter = ctx.createBiquadFilter();
      filter.type  = 'bandpass';
      filter.frequency.value = 900 + power * 800;
      filter.Q.value = 1.4;
      const gain   = ctx.createGain();
      gain.gain.setValueAtTime(0.35 + power * 0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch { /* silent */ }
  }
  useEffect(() => {
    return () => { audioCtxRef.current?.close().catch(() => {}); };
  }, []);

  // ── Rolling state ─────────────────────────────────────────────────────────
  const rollAngleRef   = useRef(0);
  const prevBallPosRef = useRef({ x: course.ballStart.x, y: course.ballStart.y });

  const [ballPos,    setBallPos]    = useState(course.ballStart);
  const [rollAngle,  setRollAngle]  = useState(0);
  const [shots,      setShots]      = useState(0);
  const [phase,      setPhase]      = useState<Phase>('idle');
  const [showKrone,  setShowKrone]  = useState(false);
  const [aimScale,   setAimScale]   = useState(1);
  // transform-origin percentages — updated on aiming start, intentionally NOT
  // reset on release (at scale=1 the origin has no visual effect, so keeping it
  // avoids a camera-drift artifact during the spring-back animation).
  const [aimOrigin,  setAimOrigin]  = useState({ x: 50, y: 50 });

  // aimAnchorRef — where the player's finger first landed (stays fixed for the whole drag).
  // aimCurrentRef — follows the finger during the drag.
  // Shot direction = (anchor → current) reversed; deadzone = dist(anchor, current).
  // aimPointerIdRef — the pointerId that initiated the aim; used to ignore stray
  //   second-finger events that would otherwise corrupt or prematurely end the aim.
  const aimAnchorRef    = useRef<{ x: number; y: number } | null>(null);
  const aimCurrentRef   = useRef<{ x: number; y: number } | null>(null);
  const aimPointerIdRef = useRef<number | null>(null);
  const [aimAnchor,   setAimAnchor]  = useState<{ x: number; y: number } | null>(null);
  const [aimDisplay,  setAimDisplay] = useState<{ x: number; y: number } | null>(null);

  // ── Debug state ───────────────────────────────────────────────────────────
  // Always declared (hooks can't be conditional); only populated when
  // GOLF_AIM_DEBUG is true so there's zero overhead in production.
  const [dbg, setDbg] = useState<DbgState>(DBG0);

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

      // ── Rolling angle accumulation ─────────────────────────────────────────
      const prev = prevBallPosRef.current;
      const ddx  = x - prev.x, ddy = y - prev.y;
      const dist = Math.hypot(ddx, ddy);
      if (dist > 0.05) {
        const sign = Math.abs(ddx) >= Math.abs(ddy) ? Math.sign(ddx) : Math.sign(ddy);
        rollAngleRef.current += sign * (dist / BALL_R) * RAD_TO_DEG;
        prevBallPosRef.current = { x, y };
      }

      setBallPos({ x, y });
      setRollAngle(rollAngleRef.current);

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

  // ── Course coordinate mapping ─────────────────────────────────────────────
  /**
   * Convert a viewport pointer position → SVG / course coordinates.
   *
   * Uses the snapshot captured at pointer-down (snapRef).
   *
   * The SVG uses preserveAspectRatio="xMidYMid meet" with a 2:3 viewBox.
   * On every phone the container is taller than the viewBox ratio, so the
   * rendered content is letterboxed: full width, with vertical padding of
   * (elemH − VH×contentScale)/2 at top and bottom.
   *
   * Formula:
   *   svgX = (clientX − left − offsetX) / contentScale
   *   svgY = (clientY − top  − offsetY) / contentScale
   *
   * Using getBoundingClientRect() (stored pre-zoom) is universally reliable —
   * it returns correct screen-space values even with CSS transforms on HTML
   * ancestor elements, which getScreenCTM() does NOT always handle correctly
   * in Chrome/Safari on mobile.
   */
  function screenToCoursePoint(
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null {
    const snap = snapRef.current;
    if (!snap) return null;
    return {
      x: (clientX - snap.left - snap.offsetX) / snap.contentScale,
      y: (clientY - snap.top  - snap.offsetY) / snap.contentScale,
    };
  }

  // ── Aim state machine helpers ─────────────────────────────────────────────
  //
  // State transitions:
  //   idle → (pointerdown near ball) → aiming
  //   aiming → (pointerup, dist ≥ MIN_DRAG) → rolling  (shot fired)
  //   aiming → (pointerup, dist < MIN_DRAG) → idle     (cancelled — deadzone)
  //   aiming → (pointercancel / leave)      → idle     (cancelled — interrupted)

  /** Tear down every piece of aim state and smoothly spring zoom back to 1. */
  function clearAimState() {
    snapRef.current         = null;
    aimAnchorRef.current    = null;
    aimCurrentRef.current   = null;
    aimPointerIdRef.current = null;
    setAimAnchor(null);
    setAimDisplay(null);
    setAimScale(1);         // smooth spring-back via CSS transition
    phaseRef.current = 'idle';
    setPhase('idle');
  }

  // ── Pointer handlers ──────────────────────────────────────────────────────

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (phaseRef.current !== 'idle') return;
    const svg = svgRef.current;
    if (!svg) return;

    // ── 1. Capture coordinate snapshot BEFORE the CSS zoom animation fires ────
    // getBoundingClientRect() gives the element's screen-space rect, correctly
    // accounting for CSS transforms on ancestor HTML elements.  The SVG content
    // is letterboxed inside this rect due to preserveAspectRatio="xMidYMid meet".
    const rect         = svg.getBoundingClientRect();
    const contentScale = Math.min(rect.width / VW, rect.height / VH);
    const offsetX      = (rect.width  - VW * contentScale) / 2;
    const offsetY      = (rect.height - VH * contentScale) / 2;
    snapRef.current    = { left: rect.left, top: rect.top, contentScale, offsetX, offsetY };

    // ── 2. Ball proximity check ───────────────────────────────────────────────
    // Convert the ball's SVG position to screen space using the snapshot, then
    // measure the screen-pixel distance to the touch point.
    // Taps further than BALL_TAP_PX from the ball are ignored — only touches
    // on/near the ball enter aim mode.
    const b           = ballRef.current;
    const ballScreenX = rect.left + offsetX + b.x * contentScale;
    const ballScreenY = rect.top  + offsetY + b.y * contentScale;
    const proximity   = Math.hypot(e.clientX - ballScreenX, e.clientY - ballScreenY);

    if (GOLF_AIM_DEBUG) {
      setDbg(d => ({ ...d,
        phase: 'pointerdown',
        bWX: b.x, bWY: b.y,
        bSX: ballScreenX, bSY: ballScreenY,
        pSX: e.clientX,   pSY: e.clientY,
        proximity, accepted: proximity <= BALL_TAP_PX,
        snapCS: contentScale, snapOX: offsetX, snapOY: offsetY,
        rectW: rect.width, rectH: rect.height,
        ptId: e.pointerId,
        aimScaleAtDown: aimScale,
      }));
    }

    if (proximity > BALL_TAP_PX) {
      snapRef.current = null;   // not a valid aim start — discard snapshot
      return;
    }

    // ── 3. Convert touch position to SVG / course coordinates ────────────────
    const pt = screenToCoursePoint(e.clientX, e.clientY);
    if (!pt) return;   // shouldn't happen — snapshot is set just above

    // ── 4. Enter aiming state ─────────────────────────────────────────────────
    phaseRef.current = 'aiming';
    setPhase('aiming');

    // Zoom out — edge-aware scale and origin shift.
    // Called AFTER the snapshot is stored so the zoom animation doesn't
    // invalidate our pre-zoom coordinate mapping.
    const params = computeAimParams(b.x, b.y);
    setAimScale(params.scale);
    setAimOrigin({ x: params.originX, y: params.originY });

    // Anchor = where the finger first landed (NOT the ball centre).
    // Shot direction = OPPOSITE of (anchor → current).
    // Starting at zero drag means no instant aim direction even when the
    // player taps near the edge of the tap zone.
    aimAnchorRef.current    = { x: pt.x, y: pt.y };
    aimCurrentRef.current   = { x: pt.x, y: pt.y };
    aimPointerIdRef.current = e.pointerId;
    setAimAnchor({ x: pt.x, y: pt.y });
    setAimDisplay({ x: pt.x, y: pt.y });

    if (GOLF_AIM_DEBUG) {
      setDbg(d => ({ ...d,
        phase: 'aiming',
        pWX: pt.x, pWY: pt.y,
        aWX: pt.x, aWY: pt.y,
        dragX: 0, dragY: 0, shotX: 0, shotY: 0,
        dragDist: 0, power: 0,
      }));
    }

    // Pointer capture: drag events keep firing even when the finger slides off
    // the SVG element (onto the header or screen bezel).
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (phaseRef.current !== 'aiming') return;
    // Ignore events from any finger that wasn't the one that started aiming
    if (e.pointerId !== aimPointerIdRef.current) return;
    const pt = screenToCoursePoint(e.clientX, e.clientY);
    if (!pt) return;
    aimCurrentRef.current = pt;
    setAimDisplay(pt);

    if (GOLF_AIM_DEBUG) {
      const anchor = aimAnchorRef.current;
      if (anchor) {
        const dragX   = pt.x - anchor.x;
        const dragY   = pt.y - anchor.y;
        const dragDist = Math.hypot(dragX, dragY);
        const power   = Math.min(dragDist, MAX_DRAG) / MAX_DRAG;
        setDbg(d => ({ ...d,
          pSX: e.clientX, pSY: e.clientY,
          pWX: pt.x,      pWY: pt.y,
          dragX, dragY,
          shotX: -dragX, shotY: -dragY,
          dragDist, power,
        }));
      }
    }
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (aimPointerIdRef.current !== null && e.pointerId !== aimPointerIdRef.current) return;
    if (phaseRef.current !== 'aiming') return;

    const anchor  = aimAnchorRef.current;
    const current = aimCurrentRef.current;
    const b       = ballRef.current;

    // Clear aim visuals + reset zoom regardless of shot outcome
    snapRef.current         = null;
    aimAnchorRef.current    = null;
    aimCurrentRef.current   = null;
    aimPointerIdRef.current = null;
    setAimAnchor(null);
    setAimDisplay(null);
    setAimScale(1);          // smooth spring-back via CSS transition

    if (!anchor || !current) { phaseRef.current = 'idle'; setPhase('idle'); return; }

    // ── Drag vector: anchor → current (pull-back-and-release model) ──────────
    // Shot direction = OPPOSITE of drag direction.
    // dragVector points where the finger went; shotVector points back at the ball.
    const dx   = current.x - anchor.x;
    const dy   = current.y - anchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Deadzone: MIN_DRAG SVG units (≈ 14 screen px at 0.65 contentScale).
    // Distances below this are treated as stray taps, not intentional shots.
    if (dist < MIN_DRAG) {
      if (GOLF_AIM_DEBUG) setDbg(d => ({ ...d, phase: 'cancelled-deadzone' }));
      phaseRef.current = 'idle'; setPhase('idle'); return;
    }

    if (GOLF_AIM_DEBUG) setDbg(d => ({ ...d, phase: 'fired' }));

    // ── Fire shot ────────────────────────────────────────────────────────────
    const power = Math.min(dist, MAX_DRAG) / MAX_DRAG;
    const speed = power * MAX_SPEED;
    prevBallPosRef.current = { x: b.x, y: b.y };
    ballRef.current = { ...b, vx: (-dx / dist) * speed, vy: (-dy / dist) * speed };
    playGolfSwing(power);

    const newShots = shotsRef.current + 1;
    shotsRef.current = newShots;
    setShots(newShots);
    phaseRef.current = 'rolling';
    setPhase('rolling');
  }

  /**
   * handlePointerCancel: finger was forcibly interrupted (incoming call,
   * notification centre swipe, palm rejection, etc.).
   * Must NOT fire a shot — just clean up and reset.
   */
  function handlePointerCancel(e: React.PointerEvent<SVGSVGElement>) {
    if (aimPointerIdRef.current !== null && e.pointerId !== aimPointerIdRef.current) return;
    if (phaseRef.current !== 'aiming') return;
    clearAimState();
  }

  /**
   * handlePointerLeave: safety-net for the rare case where pointer capture
   * is silently dropped (some mobile browsers) and the finger leaves the SVG
   * without triggering pointerup/pointercancel.  With active capture this
   * event is suppressed on most browsers, so it only fires in that edge case.
   */
  function handlePointerLeave(e: React.PointerEvent<SVGSVGElement>) {
    if (phaseRef.current === 'aiming' && e.pointerId === aimPointerIdRef.current) {
      clearAimState();
    }
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
      <div
        className="golf-game-field"
        style={{
          transform:       `scale(${aimScale})`,
          // Dynamic origin: shifts away from the edge the ball is near,
          // opening up more drag room in that direction.
          transformOrigin: `${aimOrigin.x}% ${aimOrigin.y}%`,
          // Snappy zoom-in on drag start; smooth spring-back on release.
          transition: aimScale < 1
            ? 'transform 0.16s cubic-bezier(0.25, 0, 0, 1)'
            : 'transform 0.40s cubic-bezier(0.25, 0, 0, 1)',
        }}
      >
        <svg
          ref={svgRef}
          className="golf-game-svg"
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          style={{
            // Prevent the browser from scrolling the page or zooming while
            // the player is dragging to aim.  Required for pointer events to
            // work reliably on mobile (iOS Safari, Android Chrome).
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerLeave}
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

          {/* Aim indicator — direction is anchor→current, arrow drawn from ball */}
          {phase === 'aiming' && aimAnchor && aimDisplay && (
            <AimIndicator
              bx={ballPos.x}      by={ballPos.y}
              anchorX={aimAnchor.x}  anchorY={aimAnchor.y}
              currentX={aimDisplay.x} currentY={aimDisplay.y}
            />
          )}

          {/* Ball shadow — not rotating */}
          {phase !== 'sunk' && (
            <ellipse cx={ballPos.x + 2} cy={ballPos.y + 6}
              rx={BALL_R * 0.90} ry={BALL_R * 0.38} fill="rgba(0,0,0,0.45)" />
          )}

          {/* Ball — rolling group */}
          {phase !== 'sunk' && (
            <g transform={`rotate(${rollAngle}, ${ballPos.x}, ${ballPos.y})`}>
              {/* Base sphere */}
              <circle cx={ballPos.x} cy={ballPos.y} r={BALL_R}
                fill="url(#ballGrad)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
              {/* Seam arc — horizontal */}
              <path
                d={`M ${ballPos.x - BALL_R + 1} ${ballPos.y}
                    Q ${ballPos.x} ${ballPos.y - BALL_R * 0.55}
                      ${ballPos.x + BALL_R - 1} ${ballPos.y}
                    Q ${ballPos.x} ${ballPos.y + BALL_R * 0.55}
                      ${ballPos.x - BALL_R + 1} ${ballPos.y}`}
                fill="none" stroke="rgba(50,45,90,0.38)" strokeWidth="1.4"
                style={{ pointerEvents: 'none' }} />
              {/* Seam arc — vertical */}
              <path
                d={`M ${ballPos.x} ${ballPos.y - BALL_R + 1}
                    Q ${ballPos.x + BALL_R * 0.55} ${ballPos.y}
                      ${ballPos.x} ${ballPos.y + BALL_R - 1}
                    Q ${ballPos.x - BALL_R * 0.55} ${ballPos.y}
                      ${ballPos.x} ${ballPos.y - BALL_R + 1}`}
                fill="none" stroke="rgba(50,45,90,0.28)" strokeWidth="1.2"
                style={{ pointerEvents: 'none' }} />
              {/* KRONE mark — rotates visibly */}
              <text
                x={ballPos.x} y={ballPos.y + 2.5}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="4.8" fontWeight="800"
                fontFamily="-apple-system,'Helvetica Neue',sans-serif"
                fill="rgba(40,36,70,0.72)" letterSpacing="0.5"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >KRONE</text>
            </g>
          )}

          {/* Static specular highlight — gives 3-D depth, doesn't rotate */}
          {phase !== 'sunk' && (
            <circle cx={ballPos.x - 4} cy={ballPos.y - 4} r={3.8}
              fill="rgba(255,255,255,0.68)" style={{ pointerEvents: 'none' }} />
          )}

          {/* Sunk animation */}
          {phase === 'sunk' && (
            <circle cx={ballPos.x} cy={ballPos.y} r={BALL_R}
              fill="rgba(255,255,255,0.90)" className="golf-ball-sinking" />
          )}

          {/* ── Aim debug markers (only when ?debugGolfAim is in URL) ─────── */}
          {GOLF_AIM_DEBUG && (() => {
            const cs = dbg.snapCS || 1;
            return (
              <g style={{ pointerEvents: 'none' }}>
                {/* Yellow dashed circle = BALL_TAP_PX proximity zone */}
                <circle cx={ballPos.x} cy={ballPos.y} r={BALL_TAP_PX / cs}
                  fill="none" stroke="rgba(255,220,0,0.5)" strokeWidth="1.5"
                  strokeDasharray="8 5" />
                {/* Red dot = ball centre (should be exactly under the white ball) */}
                <circle cx={ballPos.x} cy={ballPos.y} r={5}
                  fill="rgba(255,40,40,0.9)" />
                {/* MIN_DRAG deadzone circle around anchor */}
                {phase === 'aiming' && (
                  <circle cx={dbg.aWX} cy={dbg.aWY} r={MIN_DRAG}
                    fill="none" stroke="rgba(255,100,255,0.55)" strokeWidth="1.5"
                    strokeDasharray="4 4" />
                )}
                {/* Cyan dot = pointer world position */}
                {phase === 'aiming' && (
                  <circle cx={dbg.pWX} cy={dbg.pWY} r={7}
                    fill="rgba(0,255,220,0.85)" />
                )}
                {/* Orange dashed line = drag vector (anchor → current pointer) */}
                {phase === 'aiming' && dbg.dragDist > 0 && (
                  <line x1={dbg.aWX} y1={dbg.aWY} x2={dbg.pWX} y2={dbg.pWY}
                    stroke="rgba(255,160,0,0.8)" strokeWidth="2.5"
                    strokeDasharray="7 5" strokeLinecap="round" />
                )}
                {/* Blue solid line = shot vector (from ball, opposite of drag) */}
                {phase === 'aiming' && dbg.dragDist >= MIN_DRAG && (
                  <line x1={ballPos.x} y1={ballPos.y}
                        x2={ballPos.x + (dbg.shotX / dbg.dragDist) * Math.min(dbg.dragDist, MAX_DRAG) * 1.0}
                        y2={ballPos.y + (dbg.shotY / dbg.dragDist) * Math.min(dbg.dragDist, MAX_DRAG) * 1.0}
                    stroke="rgba(80,160,255,0.9)" strokeWidth="3"
                    strokeLinecap="round" />
                )}
              </g>
            );
          })()}
        </svg>

        {/* Aim hint */}
        <div className="golf-aim-hint">
          {phase === 'idle' && 'Touch ball · drag to aim · release to shoot'}
        </div>
      </div>

      {/* KRONE hole-in-one overlay */}
      <KroneOverlay active={showKrone} />

      {/* ── Golf aim debug panel — visible only when ?debugGolfAim in URL ── */}
      {GOLF_AIM_DEBUG && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.84)',
          color: '#0ff',
          fontSize: '10px',
          fontFamily: 'monospace',
          padding: '6px 10px 8px',
          zIndex: 9999,
          lineHeight: 1.65,
          pointerEvents: 'none',
          whiteSpace: 'pre',
        }}>
          {[
            `── GOLF AIM DEBUG ──────────────────────────────────`,
            `phase: ${dbg.phase}   isAiming: ${phase === 'aiming'}   ptId: ${dbg.ptId ?? '–'}`,
            `ballW  (${dbg.bWX.toFixed(0)}, ${dbg.bWY.toFixed(0)})    ballS  (${dbg.bSX.toFixed(0)}, ${dbg.bSY.toFixed(0)})`,
            `ptrS   (${dbg.pSX.toFixed(0)}, ${dbg.pSY.toFixed(0)})    ptrW   (${dbg.pWX.toFixed(1)}, ${dbg.pWY.toFixed(1)})`,
            `proximity ${dbg.proximity.toFixed(1)} px  tapPx ${BALL_TAP_PX}  accepted: ${dbg.accepted}`,
            `snap   CS ${dbg.snapCS.toFixed(3)}   oX ${dbg.snapOX.toFixed(1)}   oY ${dbg.snapOY.toFixed(1)}`,
            `svgRect  ${dbg.rectW.toFixed(0)} × ${dbg.rectH.toFixed(0)}  aimScaleAtDown ${dbg.aimScaleAtDown.toFixed(2)}`,
            `anchor (${dbg.aWX.toFixed(1)}, ${dbg.aWY.toFixed(1)})`,
            `drag   (${dbg.dragX.toFixed(1)}, ${dbg.dragY.toFixed(1)})   dist ${dbg.dragDist.toFixed(1)}   minDrag ${MIN_DRAG}`,
            `shot   (${dbg.shotX.toFixed(1)}, ${dbg.shotY.toFixed(1)})   power ${(dbg.power * 100).toFixed(0)}%   maxDrag ${MAX_DRAG}`,
          ].join('\n')}
        </div>
      )}
    </div>
  );
}
