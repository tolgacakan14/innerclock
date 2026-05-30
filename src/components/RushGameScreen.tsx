import { useState, useEffect, useRef } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────

const GAME_DURATION = 30; // seconds

// ── Difficulty helpers ────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Four-phase symbol lifetime ramp (harder curve).
 *  0 – 10 s  →  1100 ms → 900 ms
 * 10 – 20 s  →   900 ms → 720 ms
 * 20 – 25 s  →   720 ms → 600 ms
 * 25 – 30 s  →   600 ms → 500 ms  (floor 480 ms)
 */
function getLifetime(elapsed: number): number {
  if (elapsed <= 10) return Math.round(lerp(1100, 900, elapsed / 10));
  if (elapsed <= 20) return Math.round(lerp(900,  720, (elapsed - 10) / 10));
  if (elapsed <= 25) return Math.round(lerp(720,  600, (elapsed - 20) / 5));
  return Math.max(480, Math.round(lerp(600, 500, (elapsed - 25) / 5)));
}

/**
 * Three-phase symbol diameter ramp (smaller targets).
 *  0 – 20 s  →  82 px → 68 px
 * 20 – 25 s  →  68 px → 62 px
 * 25 – 30 s  →  62 px → 56 px  (floor 56 px)
 */
function getSize(elapsed: number): number {
  if (elapsed <= 20) return Math.round(lerp(82, 68, elapsed / 20));
  if (elapsed <= 25) return Math.round(lerp(68, 62, (elapsed - 20) / 5));
  return Math.max(56, Math.round(lerp(62, 56, (elapsed - 25) / 5)));
}

// ── Bonus chaser type ─────────────────────────────────────────────────────────

interface BonusChaserState {
  id:      number;
  left:    number;   // px from left edge of viewport
  top:     number;   // px from top edge of viewport
  hasFire: boolean;  // true during final 10 s
}

// ── Bonus chaser SVG character ────────────────────────────────────────────────
// Compact SVG of the muscular chaser: blond pompadour, pink briefs, sunglasses.
// viewBox centred at (0, 0) = feet. Flames overflow upward (SVG overflow visible).

function BonusChaserSVG({ hasFire }: { hasFire: boolean }) {
  return (
    <svg
      viewBox="-28 -105 56 110"
      width="52"
      height="102"
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      {/* Shadow */}
      <ellipse cx="0" cy="3" rx="13" ry="3" fill="rgba(0,0,0,0.28)" />

      {/* Legs */}
      <line x1="-4" y1="-18" x2="-10" y2="2" stroke="rgba(215,185,155,0.92)" strokeWidth="5.5" strokeLinecap="round" />
      <line x1="4"  y1="-18" x2="10"  y2="2" stroke="rgba(215,185,155,0.92)" strokeWidth="5.5" strokeLinecap="round" />
      {/* Feet */}
      <ellipse cx="-10" cy="2" rx="5.5" ry="2.5" fill="rgba(215,185,155,0.88)" />
      <ellipse cx="10"  cy="2" rx="5.5" ry="2.5" fill="rgba(215,185,155,0.88)" />
      {/* Toe lines */}
      <line x1="-13" y1="1" x2="-6"  y2="1" stroke="rgba(185,155,125,0.45)" strokeWidth="1" />
      <line x1="6"   y1="1" x2="13"  y2="1" stroke="rgba(185,155,125,0.45)" strokeWidth="1" />

      {/* Pink briefs */}
      <polygon points="-13,-18 13,-18 9,-30 -9,-30" fill="rgba(255,110,145,0.94)" />
      <rect x="-13" y="-33" width="26" height="5" rx="1" fill="rgba(255,140,168,0.92)" />
      {/* Briefs logo stripe */}
      <rect x="-2" y="-31" width="4" height="3" fill="rgba(255,255,255,0.32)" />

      {/* Torso — V-shape muscular */}
      <polygon points="-19,-33 19,-33 25,-60 -25,-60" fill="rgba(225,192,158,0.94)" />
      {/* Pec shading */}
      <ellipse cx="-9"  cy="-48" rx="8" ry="6" fill="rgba(205,172,138,0.38)" />
      <ellipse cx="9"   cy="-48" rx="8" ry="6" fill="rgba(205,172,138,0.38)" />
      {/* Ab line */}
      <line x1="0" y1="-33" x2="0" y2="-58" stroke="rgba(195,162,128,0.35)" strokeWidth="1.2" />
      <line x1="-10" y1="-41" x2="10" y2="-41" stroke="rgba(195,162,128,0.30)" strokeWidth="1" />
      <line x1="-11" y1="-50" x2="11" y2="-50" stroke="rgba(195,162,128,0.30)" strokeWidth="1" />
      {/* Shoulder highlights */}
      <ellipse cx="-22" cy="-58" rx="6" ry="4.5" fill="rgba(245,215,185,0.32)" />
      <ellipse cx="22"  cy="-58" rx="6" ry="4.5" fill="rgba(245,215,185,0.32)" />

      {/* Arms */}
      <line x1="23"  y1="-58" x2="30"  y2="-40" stroke="rgba(225,192,158,0.94)" strokeWidth="7" strokeLinecap="round" />
      <line x1="-23" y1="-58" x2="-30" y2="-40" stroke="rgba(225,192,158,0.94)" strokeWidth="7" strokeLinecap="round" />

      {/* Head */}
      <circle cx="0" cy="-71" r="11" fill="rgba(228,196,162,0.95)" />
      {/* Chin/jaw */}
      <path d="M-8,-62 Q0,-56 8,-62 Z" fill="rgba(215,182,148,0.88)" />
      {/* Cheek blush */}
      <circle cx="7" cy="-68" r="3.5" fill="rgba(240,160,140,0.20)" />

      {/* Pompadour base */}
      <path d="M-11,-75 Q0,-79 11,-75 Q12,-71 10,-67 Q0,-65 -10,-67 Q-12,-71 -11,-75 Z" fill="rgba(255,215,55,0.96)" />
      {/* Pompadour front sweep */}
      <path d="M-8,-75 Q-5,-95 2,-98 Q8,-94 9,-81 Q6,-77 0,-75 Z" fill="rgba(255,225,75,0.97)" />
      {/* Hair shine */}
      <path d="M-3,-77 Q-2,-92 1,-94 Q2,-88 2,-79 Z" fill="rgba(255,248,160,0.48)" />

      {/* Sunglasses */}
      <rect x="-12" y="-74" width="10" height="6" rx="1.5" fill="rgba(15,12,22,0.96)" />
      <rect x="2"   y="-74" width="10" height="6" rx="1.5" fill="rgba(15,12,22,0.96)" />
      <rect x="-2"  y="-72" width="4"  height="2" fill="rgba(35,30,48,0.90)" />
      {/* Lens shine */}
      <rect x="-11" y="-73" width="4" height="2" rx="1" fill="rgba(80,80,120,0.32)" />
      <rect x="3"   y="-73" width="4" height="2" rx="1" fill="rgba(80,80,120,0.32)" />
      {/* Side arms */}
      <line x1="-12" y1="-71" x2="-16" y2="-70" stroke="rgba(25,20,38,0.78)" strokeWidth="1.5" />
      <line x1="12"  y1="-71" x2="16"  y2="-70" stroke="rgba(25,20,38,0.78)" strokeWidth="1.5" />

      {/* Smirk */}
      <path d="M-3,-64 Q1,-61 5,-63" stroke="rgba(185,145,110,0.68)" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* ── Cartoon flames on head (final 10 s only) ── */}
      {hasFire && (
        <g className="rush-bonus-flames">
          {/* Outer wide flame */}
          <path d="M-10,-100 Q-6,-120 0,-124 Q6,-120 10,-100" fill="rgba(255,140,20,0.84)" />
          {/* Inner tall flame */}
          <path d="M-5,-100 Q-2,-130 1,-133 Q5,-126 5,-100" fill="rgba(255,228,50,0.92)" />
          {/* Left side flame */}
          <path d="M-8,-100 Q-12,-114 -10,-110 Q-9,-100 -8,-100" fill="rgba(255,80,0,0.80)" />
          {/* Right side flame */}
          <path d="M7,-100 Q11,-112 9,-108 Q8,-100 7,-100" fill="rgba(255,100,0,0.78)" />
          {/* Inner white-hot core */}
          <path d="M-3,-100 Q0,-122 3,-100 Z" fill="rgba(255,255,200,0.70)" />
          {/* Base glow */}
          <circle cx="0" cy="-103" r="8" fill="rgba(255,220,80,0.28)" />
        </g>
      )}
    </svg>
  );
}

// ── Grandma bonus type ────────────────────────────────────────────────────────

interface BonusGrannyState {
  id:   number;
  left: number;
  top:  number;
}

// ── Grandma bonus SVG ─────────────────────────────────────────────────────────
// Cartoon elderly lady: white bun, round specs, floral dress, arms raised.
// viewBox centred at (0, 0) = feet.

function BonusGrannySVG() {
  return (
    <svg
      viewBox="-22 -92 44 96"
      width="44"
      height="96"
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      {/* Shadow */}
      <ellipse cx="0" cy="3" rx="12" ry="3" fill="rgba(0,0,0,0.22)" />

      {/* Shoes */}
      <ellipse cx="-6" cy="1" rx="5.5" ry="2.5" fill="rgba(80,50,30,0.88)" />
      <ellipse cx="6"  cy="1" rx="5.5" ry="2.5" fill="rgba(80,50,30,0.88)" />

      {/* Stockings/legs */}
      <rect x="-9" y="-20" width="5" height="20" rx="2" fill="rgba(200,180,165,0.85)" />
      <rect x="4"  y="-20" width="5" height="20" rx="2" fill="rgba(200,180,165,0.85)" />

      {/* Dress — wider hem, floral purple */}
      <polygon points="-16,-20 16,-20 19,-52 -19,-52" fill="rgba(130,100,180,0.90)" />
      {/* Floral dots */}
      <circle cx="-8"  cy="-30" r="2.5" fill="rgba(255,180,200,0.50)" />
      <circle cx="7"   cy="-27" r="2.5" fill="rgba(180,255,180,0.50)" />
      <circle cx="0"   cy="-40" r="2"   fill="rgba(255,220,160,0.50)" />
      <circle cx="-11" cy="-44" r="1.8" fill="rgba(255,180,200,0.45)" />
      <circle cx="10"  cy="-44" r="1.8" fill="rgba(180,220,255,0.45)" />
      {/* Apron */}
      <polygon points="-7,-22 7,-22 5,-42 -5,-42" fill="rgba(255,255,255,0.25)" />

      {/* Collar */}
      <polygon points="-5,-52 5,-52 3,-58 -3,-58" fill="rgba(255,255,255,0.55)" />

      {/* Arms raised in celebration */}
      <line x1="-15" y1="-54" x2="-22" y2="-68" stroke="rgba(215,185,155,0.90)" strokeWidth="5" strokeLinecap="round" />
      <line x1="15"  y1="-54" x2="22"  y2="-68" stroke="rgba(215,185,155,0.90)" strokeWidth="5" strokeLinecap="round" />
      {/* Hands */}
      <circle cx="-22" cy="-70" r="4" fill="rgba(215,185,155,0.88)" />
      <circle cx="22"  cy="-70" r="4" fill="rgba(215,185,155,0.88)" />

      {/* Head */}
      <circle cx="0" cy="-68" r="12" fill="rgba(228,196,162,0.95)" />
      {/* Cheek blush */}
      <circle cx="8"  cy="-66" r="3.5" fill="rgba(240,160,140,0.22)" />
      <circle cx="-8" cy="-66" r="3.5" fill="rgba(240,160,140,0.22)" />

      {/* White hair bun */}
      <circle cx="0"  cy="-79" r="9" fill="rgba(245,245,245,0.95)" />
      <circle cx="-4" cy="-77" r="5" fill="rgba(255,255,255,0.90)" />
      <circle cx="4"  cy="-77" r="5" fill="rgba(255,255,255,0.90)" />
      {/* Hair pin */}
      <line x1="-5" y1="-82" x2="5" y2="-78" stroke="rgba(180,140,100,0.70)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Round spectacles */}
      <circle cx="-5.5" cy="-67" r="4" fill="none" stroke="rgba(80,55,30,0.80)" strokeWidth="1.5" />
      <circle cx="5.5"  cy="-67" r="4" fill="none" stroke="rgba(80,55,30,0.80)" strokeWidth="1.5" />
      <line x1="-1.5" y1="-67" x2="1.5" y2="-67" stroke="rgba(80,55,30,0.65)" strokeWidth="1" />
      <circle cx="-5.5" cy="-67" r="4" fill="rgba(200,235,255,0.18)" />
      <circle cx="5.5"  cy="-67" r="4" fill="rgba(200,235,255,0.18)" />

      {/* Big smile */}
      <path d="M-6,-62 Q0,-57 6,-62" stroke="rgba(175,130,95,0.75)" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      {/* Sparkles */}
      <g className="rush-granny-sparkle">
        <line x1="-20" y1="-76" x2="-16" y2="-76" stroke="rgba(255,215,50,0.90)" strokeWidth="2" strokeLinecap="round" />
        <line x1="-18" y1="-78" x2="-18" y2="-74" stroke="rgba(255,215,50,0.90)" strokeWidth="2" strokeLinecap="round" />
        <line x1="16"  y1="-82" x2="20"  y2="-82" stroke="rgba(255,180,80,0.85)" strokeWidth="2" strokeLinecap="round" />
        <line x1="18"  y1="-84" x2="18"  y2="-80" stroke="rgba(255,180,80,0.85)" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ── Symbol type ───────────────────────────────────────────────────────────────

interface SymbolState {
  id:        number;
  left:      number;
  top:       number;
  size:      number;
  spawnedAt: number;
}

interface PopItem {
  id:   number;
  cx:   number;
  ty:   number;
  text: string;
}

interface ProjectileState {
  id:     number;
  startX: number;   // viewport px — launch point
  startY: number;
  dx:     number;   // delta to target centre
  dy:     number;
}

interface HitEffect {
  id:   number;
  cx:   number;   // target centre X (viewport px)
  cy:   number;
  size: number;   // target element size (scales ring)
}

function makeSymbol(elapsed: number, prevLeft?: number, prevTop?: number): SymbolState {
  const size    = getSize(elapsed);
  const half    = size / 2;
  const hMargin = half + 22;

  const isLandscape = window.innerWidth > window.innerHeight;
  const topSafe     = isLandscape ? 88  : 112;
  const botSafe     = isLandscape ? 64  : 90;

  const vw = Math.max(320, window.innerWidth);
  const vh = Math.max(400, window.innerHeight);

  const usableW = Math.max(size, vw - hMargin * 2);
  const usableH = Math.max(size, vh - topSafe - botSafe - size);

  let cx = 0;
  let cy = 0;

  for (let attempt = 0; attempt < 4; attempt++) {
    cx = hMargin + Math.random() * usableW;
    cy = topSafe + half + Math.random() * usableH;
    if (prevLeft === undefined) break;
    const dx = cx - (prevLeft + half);
    const dy = cy - (prevTop!  + half);
    if (Math.sqrt(dx * dx + dy * dy) > size * 1.6) break;
  }

  return {
    id:        performance.now() + Math.random(),
    left:      Math.round(cx - half),
    top:       Math.round(cy - half),
    size,
    spawnedAt: performance.now(),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onComplete: (total: number, normalHits: number, finalRushHits: number, bonusPoints: number) => void;
  onHome:     () => void;
}

export default function RushGameScreen({ onComplete, onHome }: Props) {
  const [sym,             setSym]             = useState<SymbolState | null>(null);
  const [score,           setScore]           = useState(0);
  const [timeLeft,        setTimeLeft]        = useState(GAME_DURATION);
  const [pops,            setPops]            = useState<PopItem[]>([]);
  const [projectiles,     setProjectiles]     = useState<ProjectileState[]>([]);
  const [hits,            setHits]            = useState<HitEffect[]>([]);
  const [showFinalBanner, setShowFinalBanner] = useState(false);
  const [bonusChaser,     setBonusChaser]     = useState<BonusChaserState | null>(null);
  const [bonusPops,       setBonusPops]       = useState<{ id: number; cx: number; ty: number }[]>([]);
  const [bonusGranny,     setBonusGranny]     = useState<BonusGrannyState | null>(null);
  const [grannyPops,      setGrannyPops]      = useState<{ id: number; cx: number; ty: number }[]>([]);

  // ── Scoring refs (no stale closures) ──────────────────────────────────────
  const scoreRef          = useRef<number>(0);
  const normalHitsRef     = useRef<number>(0);
  const finalRushHitsRef  = useRef<number>(0);
  const bonusPointsRef    = useRef<number>(0);

  // ── Game control refs ──────────────────────────────────────────────────────
  const gameStartRef       = useRef<number>(0);
  const symRef             = useRef<SymbolState | null>(null);
  const doneRef            = useRef<boolean>(false);
  const rafRef             = useRef<number>(0);
  const finalRushShownRef  = useRef<boolean>(false);
  const onCompleteRef      = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ── Bonus chaser refs ──────────────────────────────────────────────────────
  const bonusChaserRef      = useRef<BonusChaserState | null>(null);
  const bonusSpawnTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bonusExpireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Grandma bonus refs (once per game) ────────────────────────────────────
  const bonusGrannyRef        = useRef<BonusGrannyState | null>(null);
  const bonusGrannySpawnedRef = useRef<boolean>(false);
  const grannySpawnTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grannyExpireTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Bonus chaser helpers ──────────────────────────────────────────────────

  function scheduleNextBonus() {
    if (doneRef.current) return;
    const elapsed  = (performance.now() - gameStartRef.current) / 1000;
    const tl       = GAME_DURATION - elapsed;
    if (tl <= 0) return;

    const isFinal  = tl <= 10;
    const minDelay = isFinal ? 2500 : 5000;
    const jitter   = isFinal ?  500 : 1000;
    const delay    = minDelay + Math.random() * jitter;

    bonusSpawnTimerRef.current = setTimeout(spawnBonus, delay);
  }

  function spawnBonus() {
    if (doneRef.current) return;
    const elapsed = (performance.now() - gameStartRef.current) / 1000;
    const isFinal = GAME_DURATION - elapsed <= 10;

    const W    = Math.max(320, window.innerWidth);
    const H    = Math.max(500, window.innerHeight);
    const cw   = 52;
    const ch   = 110;
    const left = 20 + Math.random() * Math.max(0, W - cw - 40);
    const top  = 110 + Math.random() * Math.max(0, H - ch - 200);

    const bc: BonusChaserState = {
      id:      performance.now() + Math.random(),
      left,
      top,
      hasFire: isFinal,
    };
    bonusChaserRef.current = bc;
    setBonusChaser(bc);

    if (bonusExpireTimerRef.current) clearTimeout(bonusExpireTimerRef.current);
    bonusExpireTimerRef.current = setTimeout(() => {
      if (bonusChaserRef.current?.id === bc.id) {
        bonusChaserRef.current = null;
        setBonusChaser(null);
      }
      scheduleNextBonus();
    }, 1800);
  }

  function handleBonusTap(e: React.PointerEvent) {
    e.stopPropagation();
    if (doneRef.current || !bonusChaserRef.current) return;

    const bc  = bonusChaserRef.current;
    const pts = 5;
    bonusPointsRef.current += pts;
    const newScore = scoreRef.current + pts;
    scoreRef.current = newScore;
    setScore(newScore);

    const cx = bc.left + 26;
    const ty = bc.top - 8;
    setBonusPops(ps => [
      ...ps.slice(-6),
      { id: performance.now() + Math.random(), cx, ty },
    ]);

    if (bonusExpireTimerRef.current) clearTimeout(bonusExpireTimerRef.current);
    bonusChaserRef.current = null;
    setBonusChaser(null);
    scheduleNextBonus();
  }

  // ── Grandma bonus helpers ─────────────────────────────────────────────────

  function spawnGranny() {
    if (doneRef.current || bonusGrannySpawnedRef.current) return;
    bonusGrannySpawnedRef.current = true;

    const W    = Math.max(320, window.innerWidth);
    const H    = Math.max(500, window.innerHeight);
    const cw   = 44;
    const ch   = 96;
    const left = 20 + Math.random() * Math.max(0, W - cw - 40);
    const top  = 110 + Math.random() * Math.max(0, H - ch - 200);

    const bg: BonusGrannyState = { id: performance.now() + Math.random(), left, top };
    bonusGrannyRef.current = bg;
    setBonusGranny(bg);

    if (grannyExpireTimerRef.current) clearTimeout(grannyExpireTimerRef.current);
    grannyExpireTimerRef.current = setTimeout(() => {
      if (bonusGrannyRef.current?.id === bg.id) {
        bonusGrannyRef.current = null;
        setBonusGranny(null);
      }
    }, 2200);
  }

  function handleGrannyTap(e: React.PointerEvent) {
    e.stopPropagation();
    if (doneRef.current || !bonusGrannyRef.current) return;

    const bg  = bonusGrannyRef.current;
    const pts = 8;
    bonusPointsRef.current += pts;
    const newScore = scoreRef.current + pts;
    scoreRef.current = newScore;
    setScore(newScore);

    const cx = bg.left + 22;
    const ty = bg.top - 8;
    setGrannyPops(ps => [
      ...ps.slice(-4),
      { id: performance.now() + Math.random(), cx, ty },
    ]);

    if (grannyExpireTimerRef.current) clearTimeout(grannyExpireTimerRef.current);
    bonusGrannyRef.current = null;
    setBonusGranny(null);
  }

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    gameStartRef.current = performance.now();
    const initial = makeSymbol(0);
    symRef.current = initial;
    setSym(initial);

    function tick() {
      const now     = performance.now();
      const elapsed = (now - gameStartRef.current) / 1000;
      const tl      = Math.max(0, GAME_DURATION - elapsed);

      setTimeLeft(tl);

      if (tl <= 10 && !finalRushShownRef.current) {
        finalRushShownRef.current = true;
        setShowFinalBanner(true);
        setTimeout(() => setShowFinalBanner(false), 1600);
      }

      if (elapsed >= GAME_DURATION) {
        if (!doneRef.current) {
          doneRef.current = true;
          setSym(null);
          if (bonusSpawnTimerRef.current)  clearTimeout(bonusSpawnTimerRef.current);
          if (bonusExpireTimerRef.current) clearTimeout(bonusExpireTimerRef.current);
          if (grannySpawnTimerRef.current) clearTimeout(grannySpawnTimerRef.current);
          if (grannyExpireTimerRef.current) clearTimeout(grannyExpireTimerRef.current);
          bonusChaserRef.current = null;
          setBonusChaser(null);
          bonusGrannyRef.current = null;
          setBonusGranny(null);
          onCompleteRef.current(
            scoreRef.current,
            normalHitsRef.current,
            finalRushHitsRef.current,
            bonusPointsRef.current,
          );
        }
        return;
      }

      const lifetime = getLifetime(elapsed);
      const current  = symRef.current;
      if (current && (now - current.spawnedAt) >= lifetime) {
        const next = makeSymbol(elapsed, current.left, current.top);
        symRef.current = next;
        setSym(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    // Recurring chaser
    scheduleNextBonus();

    // One-time grandma: random window 8–22 s
    const grannyDelay = (8 + Math.random() * 14) * 1000;
    grannySpawnTimerRef.current = setTimeout(spawnGranny, grannyDelay);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (bonusSpawnTimerRef.current)  clearTimeout(bonusSpawnTimerRef.current);
      if (bonusExpireTimerRef.current) clearTimeout(bonusExpireTimerRef.current);
      if (grannySpawnTimerRef.current) clearTimeout(grannySpawnTimerRef.current);
      if (grannyExpireTimerRef.current) clearTimeout(grannyExpireTimerRef.current);
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Normal tap handler ────────────────────────────────────────────────────
  function handleSymbolTap(e: React.PointerEvent) {
    e.stopPropagation();
    if (doneRef.current || !symRef.current) return;

    const prev    = symRef.current;
    const elapsed = (performance.now() - gameStartRef.current) / 1000;
    const isFinal = (GAME_DURATION - elapsed) <= 10;
    const pts     = isFinal ? 2 : 1;

    if (isFinal) {
      finalRushHitsRef.current++;
    } else {
      normalHitsRef.current++;
    }

    const newScore = scoreRef.current + pts;
    scoreRef.current = newScore;
    setScore(newScore);

    // Score pop: "+2" during final rush, "+1" otherwise
    setPops(ps => [
      ...ps.slice(-5),
      {
        id:   performance.now() + Math.random(),
        cx:   prev.left + prev.size / 2,
        ty:   prev.top,
        text: isFinal ? '+2' : '+1',
      },
    ]);

    // Projectile from bottom-centre toward target centre
    const startX = window.innerWidth  / 2;
    const startY = window.innerHeight - 44;
    const endX   = prev.left + prev.size / 2;
    const endY   = prev.top  + prev.size / 2;

    setProjectiles(ps => [
      ...ps.slice(-4),
      { id: performance.now() + Math.random(), startX, startY, dx: endX - startX, dy: endY - startY },
    ]);

    const hcx = endX, hcy = endY, hsz = prev.size;
    setTimeout(() => {
      setHits(hs => [
        ...hs.slice(-4),
        { id: performance.now() + Math.random(), cx: hcx, cy: hcy, size: hsz },
      ]);
    }, 145);

    const nextElapsed = (performance.now() - gameStartRef.current) / 1000;
    const next = makeSymbol(nextElapsed, prev.left, prev.top);
    symRef.current = next;
    setSym(next);
  }

  // ── Derived display state ─────────────────────────────────────────────────
  const isCritical = timeLeft <= 5  && timeLeft > 0;
  const isUrgent   = timeLeft <= 10 && timeLeft > 5;
  const isFinal10  = timeLeft <= 10 && timeLeft > 0;

  const timerClass =
    isCritical    ? 'rush-timer rush-timer--critical' :
    timeLeft <= 8 ? 'rush-timer rush-timer--urgent'   :
    'rush-timer';

  const wrapClass = [
    'rush-game-wrap',
    isUrgent   ? 'rush-wrap--intense'  : '',
    isCritical ? 'rush-wrap--critical' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={wrapClass}
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="rush-game-header overlay-light-text">
        <button
          className="color-overlay-btn"
          onClick={onHome}
          aria-label="Back to home"
          style={{ pointerEvents: 'auto' }}
        >
          ← Home
        </button>

        <span className={timerClass} aria-live="polite">
          {timeLeft.toFixed(1)}s
        </span>

        <span key={score} className="rush-score-live" aria-label={`Score: ${score}`}>
          {score}
        </span>
      </div>

      {/* ── FINAL RUSH banner ────────────────────────────────────────────── */}
      {showFinalBanner && (
        <div className="rush-final-rush-banner" aria-live="assertive">
          FINAL RUSH
        </div>
      )}

      {/* ── Tappable target ───────────────────────────────────────────────── */}
      {sym && (
        <div
          key={sym.id}
          className={`rush-symbol${isFinal10 ? ' rush-symbol--final' : ''}`}
          style={{
            position: 'absolute',
            left:   `${sym.left}px`,
            top:    `${sym.top}px`,
            width:  `${sym.size}px`,
            height: `${sym.size}px`,
          }}
          onPointerDown={handleSymbolTap}
          role="button"
          aria-label="Tap this target"
        />
      )}

      {/* ── Projectiles ───────────────────────────────────────────────────── */}
      {projectiles.map(p => (
        <div
          key={p.id}
          className="rush-projectile"
          style={{
            left: `${p.startX}px`,
            top:  `${p.startY}px`,
            '--pdx': `${p.dx}px`,
            '--pdy': `${p.dy}px`,
          } as React.CSSProperties}
          onAnimationEnd={() => setProjectiles(ps => ps.filter(proj => proj.id !== p.id))}
        />
      ))}

      {/* ── Hit burst rings ───────────────────────────────────────────────── */}
      {hits.map(h => (
        <div
          key={h.id}
          className="rush-hit-ring"
          style={{ left: `${h.cx}px`, top: `${h.cy}px`, width: `${h.size}px`, height: `${h.size}px` }}
          onAnimationEnd={() => setHits(hs => hs.filter(hit => hit.id !== h.id))}
        />
      ))}

      {/* ── Score pops (+1 / +2) ──────────────────────────────────────────── */}
      {pops.map(pop => (
        <div
          key={pop.id}
          className={`rush-pop${isFinal10 ? ' rush-pop--final' : ''}`}
          style={{ left: `${pop.cx}px`, top: `${pop.ty}px` }}
          onAnimationEnd={() => setPops(ps => ps.filter(p => p.id !== pop.id))}
        >
          {pop.text}
        </div>
      ))}

      {/* ── Final burst label ─────────────────────────────────────────────── */}
      {isCritical && (
        <div className="rush-final-burst" aria-live="assertive">
          FINAL BURST
        </div>
      )}

      {/* ── Bonus chaser target ───────────────────────────────────────────── */}
      {bonusChaser && (
        <div
          key={bonusChaser.id}
          className="rush-bonus-chaser"
          style={{
            position: 'absolute',
            left: `${bonusChaser.left}px`,
            top:  `${bonusChaser.top}px`,
          }}
          onPointerDown={handleBonusTap}
          role="button"
          aria-label="Bonus target — tap for +5"
        >
          <BonusChaserSVG hasFire={bonusChaser.hasFire} />
        </div>
      )}

      {/* ── +5 chaser pops ────────────────────────────────────────────────── */}
      {bonusPops.map(pop => (
        <div
          key={pop.id}
          className="rush-pop rush-pop--bonus"
          style={{ left: `${pop.cx}px`, top: `${pop.ty}px` }}
          onAnimationEnd={() => setBonusPops(ps => ps.filter(p => p.id !== pop.id))}
        >
          +5
        </div>
      ))}

      {/* ── Grandma bonus target (once per game) ──────────────────────────── */}
      {bonusGranny && (
        <div
          key={bonusGranny.id}
          className="rush-bonus-granny"
          style={{
            position: 'absolute',
            left: `${bonusGranny.left}px`,
            top:  `${bonusGranny.top}px`,
          }}
          onPointerDown={handleGrannyTap}
          role="button"
          aria-label="Grandma bonus — tap for +8"
        >
          <BonusGrannySVG />
        </div>
      )}

      {/* ── +8 granny pops ────────────────────────────────────────────────── */}
      {grannyPops.map(pop => (
        <div
          key={pop.id}
          className="rush-pop rush-pop--granny"
          style={{ left: `${pop.cx}px`, top: `${pop.ty}px` }}
          onAnimationEnd={() => setGrannyPops(ps => ps.filter(p => p.id !== pop.id))}
        >
          +8
        </div>
      ))}

      {/* ── Bottom hint ───────────────────────────────────────────────────── */}
      <div className="rush-bottom-hint">Tap the target before it moves</div>
    </div>
  );
}
