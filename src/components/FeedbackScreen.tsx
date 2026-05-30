import { calcScore } from '../utils';

interface Props {
  target:      number;   // hidden duration, now revealed
  actual:      number;
  roundIndex:  number;
  totalRounds: number;
  onNext:      () => void;
  onHome:      () => void;
}

function getFeedbackMsg(score: number, actual: number, target: number): string {
  if (score >= 97) return 'Pinpoint timing.';
  if (score >= 90) return 'Almost exact.';
  if (score >= 80) return 'Very close.';
  const late = actual > target;
  if (score >= 65) return late ? 'Slightly too long.'  : 'Slightly too short.';
  if (score >= 40) return late ? 'Held too long.'      : 'Released too early.';
  if (score >= 15) return late ? 'Way too long.'       : 'Way too short.';
  return 'Missed the rhythm.';
}

export default function FeedbackScreen({
  target, actual, roundIndex, totalRounds, onNext, onHome,
}: Props) {
  const error   = Math.abs(target - actual);
  const score   = calcScore(error);
  const message = getFeedbackMsg(score, actual, target);

  return (
    <div className="screen feedback-screen">
      <div className="game-header">
        <button className="home-btn" onClick={onHome} aria-label="Back to home">← Home</button>
        <span className="round-indicator">Round {roundIndex + 1} of {totalRounds}</span>
      </div>

      {/* ── Big round score ─────────────────────────────────────────── */}
      <div className="feedback-big-score">
        <span className="feedback-score-num">{score}</span>
        <span className="feedback-score-label"> / 100</span>
      </div>

      <p className="feedback-score-msg">{message}</p>

      {/* ── Detail card ─────────────────────────────────────────────── */}
      <div className="feedback-rows">
        <div className="feedback-row">
          <span>Target</span>
          <span>{target.toFixed(2)} s</span>
        </div>
        <div className="feedback-row">
          <span>Yours</span>
          <span>{actual.toFixed(2)} s</span>
        </div>
        <div className="feedback-row score-row">
          <span>Difference</span>
          <span className={error <= 0.15 ? 'good' : error > 0.60 ? 'bad' : ''}>
            {error.toFixed(2)} s
          </span>
        </div>
      </div>

      <button className="btn-primary" onClick={onNext}>
        {roundIndex + 1 < totalRounds ? 'Next Round →' : 'See Results →'}
      </button>
    </div>
  );
}
