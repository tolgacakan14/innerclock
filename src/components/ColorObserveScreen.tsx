import { useState, useEffect, useRef } from 'react';
import type { TargetColor } from '../types';
import { isColorLight } from '../utils';

interface Props {
  color:       TargetColor;
  roundIndex:  number;
  totalRounds: number;
  onDone:      () => void;
  onHome:      () => void;
}

type Phase = 'ready' | 'watching' | 'fading';

export default function ColorObserveScreen({
  color, roundIndex, totalRounds, onDone, onHome,
}: Props) {
  const [phase,     setPhase]     = useState<Phase>('ready');
  const [countdown, setCountdown] = useState(5);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // 700 ms buffer before flooding viewport — prevents jarring instant appearance
  useEffect(() => {
    const t = setTimeout(() => setPhase('watching'), 700);
    return () => clearTimeout(t);
  }, []);

  // Tick the countdown every second while the color is visible
  useEffect(() => {
    if (phase !== 'watching') return;
    const id = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // When countdown hits 0, pause briefly, then begin fading
  useEffect(() => {
    if (phase !== 'watching' || countdown !== 0) return;
    const t = setTimeout(() => setPhase('fading'), 500);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // After fade-out (420 ms), advance to matching screen
  useEffect(() => {
    if (phase !== 'fading') return;
    const t = setTimeout(() => onDoneRef.current(), 420);
    return () => clearTimeout(t);
  }, [phase]);

  const flatBg = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;

  const adaptText = phase === 'watching'
    ? (isColorLight(color.h, color.s, color.l) ? 'overlay-dark-text' : 'overlay-light-text')
    : 'overlay-light-text';

  const bgClass = [
    'color-fullscreen-bg',
    phase === 'watching' ? 'visible' : '',
    phase === 'fading'   ? 'fading'  : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="color-fullscreen-wrap">
      {/* Full-viewport color fill */}
      <div className={bgClass} style={{ background: flatBg }} />

      {/* Floating header */}
      <div className={`color-fullscreen-header ${adaptText}`}>
        <button className="color-overlay-btn" onClick={onHome} aria-label="Back to home">
          ← Home
        </button>
        <span className="color-overlay-round">Round {roundIndex + 1} of {totalRounds}</span>
      </div>

      {/* Countdown overlay — only while color is fully visible */}
      {phase === 'watching' && (
        <>
          {/* Small label near top — shrinks / fades as count reaches 1 */}
          <div className={`color-observe-label ${adaptText}${countdown <= 1 ? ' color-observe-label--fading' : ''}`}>
            Remember the colour
          </div>

          {/* Big focal number — key forces re-animation each tick */}
          <div className={`color-observe-stage ${adaptText}`}>
            <span
              className={`color-observe-num count-n${countdown}`}
              key={countdown}
            >
              {countdown}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
