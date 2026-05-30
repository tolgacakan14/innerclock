import { useState } from 'react';
import type { ArrowEscapeRoundResult } from '../types';

interface Props {
  rounds:      ArrowEscapeRoundResult[];
  playerName:  string;
  onPlayAgain: () => void;
  onExit:      () => void;
}

function getMessage(totalTime: number): string {
  if (totalTime <  90) return 'Escape master.';
  if (totalTime < 130) return 'Sharp planner.';
  if (totalTime < 180) return 'Good logic flow.';
  if (totalTime < 240) return 'You found the exits.';
  return 'The arrows trapped you.';
}

export default function ArrowEscapeResultsScreen({ rounds, playerName, onPlayAgain, onExit }: Props) {
  const [copied, setCopied] = useState(false);
  const totalTime  = rounds.reduce((s, r) => s + r.solveTime, 0);
  const totalSecs  = +totalTime.toFixed(1);
  const message    = getMessage(totalSecs);
  const fmtTime    = (s: number) => s.toFixed(1) + 's';

  function handleCopy() {
    const name = playerName.trim();
    const text = name
      ? `${name} cleared InnerClock Arrow Escape in ${totalSecs}s. Can you solve faster?`
      : `I cleared InnerClock Arrow Escape in ${totalSecs}s. Can you solve faster?`;
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

      {/* Primary score — total solve time */}
      <div className="final-score">
        <span className="score-number ae-total-time">{totalSecs}</span>
        <span className="score-denom">s total</span>
      </div>

      <p className="ae-results-hint">Lower is better</p>
      <p className="score-message">{message}</p>

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
    </div>
  );
}
