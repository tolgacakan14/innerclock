import { useState } from 'react';
import type { ArrowEscapeRoundResult, RoomContext } from '../types';
import RoomSubmitPanel from './RoomSubmitPanel';

interface Props {
  rounds:       ArrowEscapeRoundResult[];
  playerName:   string;
  onPlayAgain:  () => void;
  onExit:       () => void;
  roomContext?: RoomContext;
}

function getMessage(finalTime: number): string {
  if (finalTime <  90) return 'Escape master.';
  if (finalTime < 130) return 'Sharp planner.';
  if (finalTime < 180) return 'Good logic flow.';
  if (finalTime < 240) return 'You found the exits.';
  return 'The arrows trapped you.';
}

const PENALTY_PER_MISTAKE = 5;

export default function ArrowEscapeResultsScreen({ rounds, playerName, onPlayAgain, onExit, roomContext }: Props) {
  const [copied, setCopied] = useState(false);

  const rawTime      = rounds.reduce((s, r) => s + r.solveTime, 0);
  const totalMistakes = rounds.reduce((s, r) => s + r.mistakes, 0);
  const penaltyTime  = totalMistakes * PENALTY_PER_MISTAKE;
  const finalTime    = +(rawTime + penaltyTime).toFixed(1);
  const rawSecs      = +rawTime.toFixed(1);
  const message      = getMessage(finalTime);
  const fmtTime      = (s: number) => s.toFixed(1) + 's';

  function handleCopy() {
    const name = playerName.trim();
    const text = name
      ? `${name} cleared Krone Arrow Escape in ${finalTime}s. Can you solve faster?`
      : `I cleared Krone Arrow Escape in ${finalTime}s. Can you solve faster?`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="screen results-screen">
      <p className="results-player-name">
        {playerName ? `${playerName}'s Time` : 'Your Time'}
      </p>

      {/* Primary score — penalised total time */}
      <div className="final-score">
        <span className="score-number ae-total-time">{finalTime}</span>
        <span className="score-denom">s</span>
      </div>

      <p className="ae-results-hint">Lower is better</p>
      <p className="score-message">{message}</p>

      {/* Time breakdown */}
      <div className="feedback-rows">
        <div className="feedback-row">
          <span>Solve time</span>
          <span>{fmtTime(rawSecs)}</span>
        </div>
        <div className="feedback-row">
          <span>Wrong taps</span>
          <span>{totalMistakes}</span>
        </div>
        <div className="feedback-row" style={{ color: totalMistakes > 0 ? '#FF453A' : 'inherit' }}>
          <span>Penalty (+{PENALTY_PER_MISTAKE}s each)</span>
          <span>+{fmtTime(penaltyTime)}</span>
        </div>
        <div className="feedback-row rush-results-total-row">
          <span>Final time</span>
          <span>{fmtTime(finalTime)}</span>
        </div>
      </div>

      {/* Per-round breakdown */}
      <div className="results-list">
        {rounds.map((r, i) => (
          <div key={i} className="results-list-row">
            <span className="results-list-round">Round {i + 1}</span>
            <span className="ae-results-board-name">{r.boardName}</span>
            {r.mistakes > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#FF453A' }}>{r.mistakes}✕</span>
            )}
            <span className="results-list-score">{fmtTime(r.solveTime)}</span>
          </div>
        ))}
      </div>

      <div className="actions">
        <button className="btn-primary" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Result'}
        </button>
        <button className="btn-secondary" onClick={onPlayAgain}>Play Again</button>
        <button className="btn-ghost"     onClick={onExit}>← Home</button>
      </div>

      {roomContext && (
        <RoomSubmitPanel
          roomContext={roomContext}
          mode="Arrow Escape"
          scoreValue={finalTime}
          scoreLabel={`${finalTime}s`}
          scoreType="lower_is_better"
          onBackToRoom={onExit}
        />
      )}
    </div>
  );
}
