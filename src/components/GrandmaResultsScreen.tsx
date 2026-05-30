import { useState } from 'react';
import type { GrandmaRoundResult } from '../types';

interface Props {
  rounds:      GrandmaRoundResult[];
  playerName:  string;
  onPlayAgain: () => void;
  onExit:      () => void;
}

function getMessage(total: number): string {
  if (total >= 80) return 'Legendary survivor.';
  if (total >= 60) return 'Strong reflexes.';
  if (total >= 40) return 'Solid run.';
  if (total >= 25) return 'You held on.';
  return 'Grandma needs a break.';
}

function buildCopyText(playerName: string, total: number): string {
  const name = playerName.trim();
  const base = name
    ? `${name} scored ${total} in InnerClock Grandma Walking.`
    : `I scored ${total} in InnerClock Grandma Walking.`;
  return `${base} Can you survive longer?`;
}

export default function GrandmaResultsScreen({ rounds, playerName, onPlayAgain, onExit }: Props) {
  const [copied, setCopied] = useState(false);
  const total   = rounds.reduce((s, r) => s + r.score, 0);
  const message = getMessage(total);

  function handleCopy() {
    const text = buildCopyText(playerName, total);
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
    <div className="screen grandma-results-screen">
      <p className="results-player-name">
        {playerName ? `${playerName}'s Score` : 'Your Score'}
      </p>

      {/* Big total */}
      <div className="grandma-total-block">
        <span className="grandma-total-num">{total}</span>
        <span className="grandma-total-label">points</span>
      </div>

      <p className="score-message">{message}</p>

      {/* Per-round list */}
      <div className="grandma-rounds-list">
        {rounds.map((r, i) => (
          <div key={i} className="grandma-rounds-row">
            <span className="grandma-rounds-index">{i + 1}</span>
            <span className="grandma-rounds-name">{r.patternName}</span>
            <span className="grandma-rounds-score">{r.score} s</span>
          </div>
        ))}
      </div>

      <div className="actions">
        <button className="btn-primary"   onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Result'}
        </button>
        <button className="btn-secondary" onClick={onPlayAgain}>Play Again</button>
        <button className="btn-ghost"     onClick={onExit}>← Home</button>
      </div>
    </div>
  );
}
