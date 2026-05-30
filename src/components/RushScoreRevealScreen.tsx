import { useState, useEffect } from 'react';

interface Props {
  totalTaps:  number;   // normalHits + finalRushHits
  score:      number;   // raw total score
  onContinue: () => void;
}

/** Cubic ease-out: fast start, smooth finish. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function RushScoreRevealScreen({ totalTaps, score, onContinue }: Props) {
  const [displayScore, setDisplayScore] = useState(0);
  const [displayTaps,  setDisplayTaps]  = useState(0);

  // ── Count-up animation — score and taps climb in sync ─────────────────────
  useEffect(() => {
    const DURATION_MS = 950;
    const start = performance.now();
    let raf: number;

    const tick = () => {
      const elapsed  = performance.now() - start;
      const progress = Math.min(1, elapsed / DURATION_MS);
      const eased    = easeOutCubic(progress);

      setDisplayScore(Math.round(eased * score));
      setDisplayTaps(Math.round(eased * totalTaps));

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, totalTaps]);

  return (
    <div className="rush-reveal-wrap">
      <div className="rush-reveal-inner">

        {/* Mode label */}
        <p className="rush-reveal-mode-label">Rush Mode</p>

        {/* Big animated score */}
        <div className="rush-reveal-score-block">
          <span className="rush-reveal-num">{displayScore}</span>
          <span className="rush-reveal-denom">pts</span>
        </div>

        {/* Secondary — tap count */}
        <p className="rush-reveal-taps-line">{displayTaps} taps total</p>

        {/* Continue button */}
        <button
          className="btn-primary rush-reveal-cta"
          onClick={onContinue}
        >
          View Details →
        </button>

      </div>
    </div>
  );
}
