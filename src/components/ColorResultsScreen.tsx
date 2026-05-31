import { useState } from 'react';
import type { ColorRound, RoomContext } from '../types';
import RoomSubmitPanel from './RoomSubmitPanel';

interface Props {
  rounds:       ColorRound[];
  playerName:   string;
  onPlayAgain:  () => void;
  onExit:       () => void;
  roomContext?: RoomContext;
}

function getMessage(score: number): string {
  if (score >= 450) return 'Near-perfect color memory.';
  if (score >= 350) return 'Exceptional color perception.';
  if (score >= 250) return 'Strong color recall.';
  if (score >= 150) return 'Decent, but some colors slipped.';
  return 'Your color memory needs training.';
}

export default function ColorResultsScreen({ rounds, playerName, onPlayAgain, onExit, roomContext }: Props) {
  const [copied, setCopied] = useState(false);
  const total   = rounds.reduce((s, r) => s + r.score, 0);
  const message = getMessage(total);

  function handleCopy() {
    const text = `${playerName} scored ${total}/500 on Krone Colour Mode. Can you match the colour?`;
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
      {/* Player attribution */}
      <p className="results-player-name">{playerName}'s Score</p>

      <div className="final-score">
        <span className="score-number">{total}</span>
        <span className="score-denom">/ 500</span>
      </div>

      <p className="score-message">{message}</p>

      {/* Round breakdown — dark glass cards with mini swatches */}
      <div className="results-list">
        {rounds.map((r, i) => (
          <div key={i} className="results-list-row">
            <span className="results-list-round">Round {i + 1}</span>
            <div className="results-color-swatches">
              <div className="results-swatch-pair">
                <div
                  className="results-mini-swatch"
                  style={{ background: `hsl(${r.target.h}, ${r.target.s}%, ${r.target.l}%)` }}
                  aria-label={`Target color`}
                />
                <div
                  className="results-mini-swatch"
                  style={{ background: `hsl(${r.selected.h}, ${r.selected.s}%, ${r.selected.l}%)` }}
                  aria-label={`Your color`}
                />
              </div>
            </div>
            <span className="results-list-score">{r.score}</span>
          </div>
        ))}
      </div>

      <div className="actions">
        <button className="btn-primary" onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy Result'}
        </button>
        <button className="btn-secondary" onClick={onPlayAgain}>Play Again</button>
        <button className="btn-ghost" onClick={onExit}>← Home</button>
      </div>

      {roomContext && (
        <RoomSubmitPanel
          roomContext={roomContext}
          mode="Colour Mode"
          scoreValue={total}
          scoreLabel={`${total} / 500`}
          scoreType="higher_is_better"
          onBackToRoom={onExit}
        />
      )}
    </div>
  );
}
