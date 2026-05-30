import { useState, useRef } from 'react';
import HypnosisRings from './HypnosisRings';

interface Props {
  roundIndex:  number;
  totalRounds: number;
  onComplete:  (actual: number) => void;
  onHome:      () => void;
}

type Phase = 'idle' | 'holding' | 'releasing';

export default function ReproduceScreen({ roundIndex, totalRounds, onComplete, onHome }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const pressStart = useRef<number | null>(null);
  const committed  = useRef(false);

  // ── Pointer down anywhere on the screen ──────────────────────────────────
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Ignore taps on any button (covers ← Home)
    if ((e.target as Element).closest('button')) return;
    if (phase !== 'idle') return;

    e.currentTarget.setPointerCapture(e.pointerId);
    pressStart.current = performance.now();
    committed.current  = false;
    setPhase('holding');
  }

  // ── Pointer up / cancel anywhere ─────────────────────────────────────────
  function handlePointerUp() {
    if (phase !== 'holding' || pressStart.current === null) return;
    if (committed.current) return;
    committed.current = true;

    const elapsed = (performance.now() - pressStart.current) / 1000;
    pressStart.current = null;
    setPhase('releasing');

    // Rings retract animation (~300 ms), then report the elapsed time
    setTimeout(() => onComplete(elapsed), 300);
  }

  const isActive = phase === 'holding' || phase === 'releasing';

  return (
    <div
      className="observe-fullscreen-wrap"
      style={{ cursor: phase === 'idle' ? 'pointer' : 'default', userSelect: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Full-screen rings — appear on hold, fade on release */}
      {isActive && (
        <div
          className={`observe-rings-layer${phase === 'releasing' ? ' fading' : ''}`}
          style={{ pointerEvents: 'none' }}
        >
          <HypnosisRings fullScreen />
        </div>
      )}

      {/* Header — always on top, always interactive */}
      <div
        className="color-fullscreen-header overlay-light-text"
        style={{ pointerEvents: 'auto' }}
      >
        <button className="color-overlay-btn" onClick={onHome} aria-label="Back to home">
          ← Home
        </button>
        <span className="color-overlay-round">
          Round {roundIndex + 1} of {totalRounds}
        </span>
      </div>

      {/* Centre content — non-interactive overlay */}
      <div className="reproduce-center" style={{ pointerEvents: 'none' }}>
        {phase === 'idle' && (
          <>
            <p className="reproduce-title">Recreate the duration</p>
            <p className="reproduce-sub">
              Press anywhere and hold.<br />Release when it feels right.
            </p>
            <p className="reproduce-tap-hint">TAP TO BEGIN</p>
          </>
        )}

        {isActive && (
          <p className="reproduce-holding-hint">
            Release when it feels right
          </p>
        )}
      </div>
    </div>
  );
}
