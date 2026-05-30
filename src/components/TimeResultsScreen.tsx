import { useState } from 'react';
import type { Round, RoomContext } from '../types';
import RoomSubmitPanel from './RoomSubmitPanel';

interface Props {
  rounds:       Round[];
  playerName:   string;
  onPlayAgain:  () => void;
  onExit:       () => void;
  roomContext?: RoomContext;
}

function getMessage(total: number): string {
  if (total >= 450) return 'Exceptional time memory.';
  if (total >= 375) return 'Strong internal clock.';
  if (total >= 275) return 'Good, but your timing drifts.';
  if (total >= 175) return 'Your timing needs practice.';
  return 'Your clock lost the rhythm.';
}

export default function TimeResultsScreen({ rounds, playerName, onPlayAgain, onExit, roomContext }: Props) {
  const [copied, setCopied] = useState(false);
  const total   = rounds.reduce((s, r) => s + r.score, 0);
  const message = getMessage(total);

  function handleCopy() {
    const text = `${playerName} scored ${total}/500 on Krone Time Mode. Can you match the rhythm?`;
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

      {/* ── Round breakdown ──────────────────────────────────────────── */}
      <div className="results-list">
        {rounds.map((r, i) => (
          <div key={i} className="results-list-row">
            <span className="results-list-round">Round {i + 1}</span>
            <div className="results-list-data">
              <span className="results-data-pair">
                <span className="results-data-label">Target</span>
                <span className="results-data-val">{r.target.toFixed(2)} s</span>
              </span>
              <span className="results-data-pair">
                <span className="results-data-label">Yours</span>
                <span className="results-data-val">{r.actual.toFixed(2)} s</span>
              </span>
              <span className="results-data-pair">
                <span className="results-data-label">Diff</span>
                <span className="results-data-val">{r.error.toFixed(2)} s</span>
              </span>
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
          mode="Time Mode"
          scoreValue={total}
          scoreLabel={`${total} / 500`}
          scoreType="higher_is_better"
          onBackToRoom={onExit}
        />
      )}
    </div>
  );
}
