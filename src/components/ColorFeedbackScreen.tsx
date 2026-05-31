import type { TargetColor } from '../types';
import { calcColorScore } from '../utils';

interface Props {
  target:      TargetColor;   // revealed here for the first time
  selected:    TargetColor;
  roundIndex:  number;
  totalRounds: number;
  onNext:      () => void;
  onHome:      () => void;
}

function getFeedbackMsg(score: number): string {
  if (score >= 97) return 'Flawless.';
  if (score >= 90) return 'Nearly perfect.';
  if (score >= 80) return 'Very close.';
  if (score >= 65) return 'Close, but off.';
  if (score >= 40) return 'Different color.';
  if (score >= 15) return 'Far off.';
  return 'Missed the color.';
}

export default function ColorFeedbackScreen({
  target, selected, roundIndex, totalRounds, onNext, onHome,
}: Props) {
  const { score } = calcColorScore(target, selected);
  const message = getFeedbackMsg(score);

  return (
    <div className="screen feedback-screen">
      <div className="game-header">
        <button className="home-btn" onClick={onHome} aria-label="Back to home">← Home</button>
        <span className="round-indicator">Round {roundIndex + 1} of {totalRounds}</span>
      </div>

      {/* Big round score — same display as Time Mode */}
      <div className="feedback-big-score">
        <span className="feedback-score-num">{score}</span>
        <span className="feedback-score-label"> / 100</span>
      </div>

      <p className="feedback-score-msg">{message}</p>

      {/* Large side-by-side swatches */}
      <div className="color-compare">
        <div className="color-compare-item">
          <div
            className="color-swatch-lg"
            style={{ background: `hsl(${target.h}, ${target.s}%, ${target.l}%)` }}
          />
          <span className="swatch-label">Target colour</span>
        </div>
        <span className="compare-divider" aria-hidden="true">vs</span>
        <div className="color-compare-item">
          <div
            className="color-swatch-lg"
            style={{ background: `hsl(${selected.h}, ${selected.s}%, ${selected.l}%)` }}
          />
          <span className="swatch-label">Your colour</span>
        </div>
      </div>

      <button className="btn-primary" onClick={onNext}>
        {roundIndex + 1 < totalRounds ? 'Next Round →' : 'See Results →'}
      </button>
    </div>
  );
}
