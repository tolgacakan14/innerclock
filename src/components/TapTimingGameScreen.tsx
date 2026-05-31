import { useState, useRef, useEffect, useCallback } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────

const GAME_DURATION = 30;   // seconds
const TAP_COOLDOWN  = 200;  // ms between taps (prevents spam)
const GOOD_HALF     = 0.20; // good zone half-width (±20% of center)

// ── Difficulty helpers ────────────────────────────────────────────────────────

/** Marker speed in bounces/second: increases from 0.45 → 1.6 over 30 s. */
function getSpeed(elapsed: number): number {
  return 0.45 + (elapsed / GAME_DURATION) * 1.15;
}

/** Perfect zone half-width: shrinks from 0.13 → 0.06 over 30 s. */
function getPerfectHalf(elapsed: number): number {
  return Math.max(0.06, 0.13 - (elapsed / GAME_DURATION) * 0.07);
}

// ── Feedback pop type ─────────────────────────────────────────────────────────

interface FeedbackPop {
  id:   number;
  pos:  number;   // 0–1 position on bar
  text: string;
  type: 'perfect' | 'good' | 'miss';
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onComplete: (perfects: number, goods: number, misses: number, maxCombo: number, score: number) => void;
  onHome:     () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TapTimingGameScreen({ onComplete, onHome }: Props) {
  const [markerPos,  setMarkerPos]  = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(GAME_DURATION);
  const [score,      setScore]      = useState(0);
  const [combo,      setCombo]      = useState(0);
  const [pops,       setPops]       = useState<FeedbackPop[]>([]);

  // Mutable refs — avoid stale closures in RAF
  const markerRef     = useRef(0);      // position 0–1
  const dirRef        = useRef(1);      // direction: +1 = right, -1 = left
  const lastTickRef   = useRef(0);      // timestamp of last tick
  const startRef      = useRef(0);
  const scoreRef      = useRef(0);
  const perfectsRef   = useRef(0);
  const goodsRef      = useRef(0);
  const missesRef     = useRef(0);
  const comboRef      = useRef(0);
  const maxComboRef   = useRef(0);
  const cooldownRef   = useRef(false);
  const doneRef       = useRef(false);
  const rafRef        = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ── RAF game loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    startRef.current   = performance.now();
    lastTickRef.current = performance.now();

    function tick(now: number) {
      const elapsed = (now - startRef.current) / 1000;
      const tl      = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(tl);

      if (elapsed >= GAME_DURATION) {
        if (!doneRef.current) {
          doneRef.current = true;
          const s = scoreRef.current;
          onCompleteRef.current(
            perfectsRef.current,
            goodsRef.current,
            missesRef.current,
            maxComboRef.current,
            s,
          );
        }
        return;
      }

      // Update marker position
      const dt    = Math.min((now - lastTickRef.current) / 1000, 0.1); // clamp dt
      lastTickRef.current = now;

      const speed = getSpeed(elapsed);
      let   pos   = markerRef.current + dirRef.current * speed * dt;

      if (pos >= 1) { pos = 2 - pos; dirRef.current = -1; }
      if (pos <= 0) { pos = -pos;     dirRef.current =  1; }

      markerRef.current = pos;
      setMarkerPos(pos);

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Tap handler ───────────────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    if (doneRef.current || cooldownRef.current) return;

    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, TAP_COOLDOWN);

    const elapsed     = (performance.now() - startRef.current) / 1000;
    const pos         = markerRef.current;
    const dist        = Math.abs(pos - 0.5);
    const perfectHalf = getPerfectHalf(elapsed);

    let pts  = 0;
    let type: FeedbackPop['type'] = 'miss';
    let text = 'MISS';

    if (dist <= perfectHalf) {
      type = 'perfect';
      comboRef.current++;
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
      // Every 3rd consecutive perfect = +5 bonus
      const bonus = comboRef.current % 3 === 0 ? 5 : 0;
      pts  = 10 + bonus;
      text = bonus > 0 ? `PERFECT +${pts}` : 'PERFECT +10';
      perfectsRef.current++;
      setCombo(comboRef.current);
    } else if (dist <= GOOD_HALF) {
      type = 'good';
      pts  = 5;
      text = 'GOOD +5';
      comboRef.current = 0;
      goodsRef.current++;
      setCombo(0);
    } else {
      missesRef.current++;
      comboRef.current = 0;
      setCombo(0);
    }

    scoreRef.current += pts;
    setScore(scoreRef.current);

    setPops(prev => [
      ...prev.slice(-8),
      { id: performance.now() + Math.random(), pos, text, type },
    ]);
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
  const elapsed     = GAME_DURATION - timeLeft;
  const perfectHalf = getPerfectHalf(elapsed);
  const isCritical  = timeLeft <= 5;

  // Convert zone widths to percentage for bar display
  const perfectPct = perfectHalf * 100;
  const goodPct    = GOOD_HALF * 100;
  const markerPct  = markerPos * 100;

  return (
    <div
      className="tt-game-wrap"
      onPointerDown={handleTap}
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
    >
      {/* Header */}
      <div className="tt-header">
        <button
          className="color-overlay-btn"
          onClick={e => { e.stopPropagation(); onHome(); }}
          aria-label="Back to home"
          style={{ pointerEvents: 'auto' }}
        >
          ← Home
        </button>
        <span className={`tt-timer${isCritical ? ' tt-timer--critical' : ''}`}>
          {timeLeft.toFixed(1)}s
        </span>
        <span className="tt-score-live">{score}</span>
      </div>

      {/* Combo */}
      {combo >= 2 && (
        <div className="tt-combo">
          x{combo} combo
        </div>
      )}

      {/* Bar */}
      <div className="tt-bar-wrap">
        <div className="tt-bar">
          {/* Miss zones (implied by background) */}
          {/* Good zones */}
          <div
            className="tt-zone tt-zone--good"
            style={{
              left:  `${50 - goodPct}%`,
              width: `${goodPct * 2}%`,
            }}
          />
          {/* Perfect zone */}
          <div
            className="tt-zone tt-zone--perfect"
            style={{
              left:  `${50 - perfectPct}%`,
              width: `${perfectPct * 2}%`,
            }}
          />
          {/* Center marker line */}
          <div className="tt-bar-center" />
          {/* Moving marker */}
          <div
            className="tt-marker"
            style={{ left: `${markerPct}%` }}
          />
          {/* Feedback pops on bar */}
          {pops.map(pop => (
            <div
              key={pop.id}
              className={`tt-pop tt-pop--${pop.type}`}
              style={{ left: `${pop.pos * 100}%` }}
              onAnimationEnd={() => setPops(prev => prev.filter(p => p.id !== pop.id))}
            >
              {pop.text}
            </div>
          ))}
        </div>

        {/* Zone labels */}
        <div className="tt-zone-labels">
          <span>MISS</span>
          <span className="tt-label--good">GOOD</span>
          <span className="tt-label--perfect">PERFECT</span>
          <span className="tt-label--good">GOOD</span>
          <span>MISS</span>
        </div>
      </div>

      {/* Tap hint */}
      <div className="tt-hint">
        Tap anywhere when the marker is in the zone
      </div>

    </div>
  );
}
