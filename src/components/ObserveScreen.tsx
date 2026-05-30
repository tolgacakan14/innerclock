import { useState, useEffect, useRef } from 'react';
import HypnosisRings from './HypnosisRings';

interface Props {
  duration:    number;   // hidden target duration — never shown to player
  roundIndex:  number;
  totalRounds: number;
  onDone:      () => void;
  onHome:      () => void;
}

type Phase = 'watching' | 'fading';

export default function ObserveScreen({
  duration, roundIndex, totalRounds, onDone, onHome,
}: Props) {
  // Timing starts immediately on mount — the hidden duration begins here
  const [phase, setPhase] = useState<Phase>('watching');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // After the hidden duration elapses, fade the rings out
  useEffect(() => {
    const t = setTimeout(() => setPhase('fading'), duration * 1000);
    return () => clearTimeout(t);
  }, [duration]);

  // After the ring fade (420 ms), hand off to reproduction
  useEffect(() => {
    if (phase !== 'fading') return;
    const t = setTimeout(() => onDoneRef.current(), 420);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    // position:fixed escapes .app max-width so rings fill the true viewport.
    // opacity-only animation avoids creating a stacking context that would
    // trap fixed children (a transform on the parent would do that).
    <div className="observe-fullscreen-wrap">
      {/* Full-screen hypnosis rings — fade out when phase = fading */}
      <div className={`observe-rings-layer${phase === 'fading' ? ' fading' : ''}`}>
        <HypnosisRings fullScreen />
      </div>

      {/* Minimal floating header — same pattern as Color Mode observe */}
      <div className="color-fullscreen-header overlay-light-text">
        <button
          className="color-overlay-btn"
          onClick={onHome}
          aria-label="Back to home"
        >
          ← Home
        </button>
        <span className="color-overlay-round">
          Round {roundIndex + 1} of {totalRounds}
        </span>
      </div>

      {/* Bottom hint — minimal, doesn't distract from the visual */}
      <div className="observe-hint-overlay">
        Watch the rhythm
      </div>
    </div>
  );
}
