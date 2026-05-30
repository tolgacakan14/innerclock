import { useState } from 'react';
import type { GolfRoundResult, RoomContext } from '../types';
import RoomSubmitPanel from './RoomSubmitPanel';

interface Props {
  rounds:       GolfRoundResult[];
  playerName:   string;
  onPlayAgain:  () => void;
  onExit:       () => void;
  roomContext?: RoomContext;
}

function getMessage(total: number): string {
  if (total <= 8)  return 'Legendary precision.';
  if (total <= 13) return 'Elite control.';
  if (total <= 19) return 'Clean round.';
  if (total <= 29) return 'Solid, but room to improve.';
  return 'The course fought back.';
}

function buildCopyText(playerName: string, total: number): string {
  const name = playerName.trim();
  const base = name
    ? `${name} finished InnerClock Golf Mode in ${total} total shots.`
    : `I finished InnerClock Golf Mode in ${total} total shots.`;
  return `${base} Can you beat it?`;
}

export default function GolfResultsScreen({ rounds, playerName, onPlayAgain, onExit, roomContext }: Props) {
  const [copied, setCopied] = useState(false);
  const total   = rounds.reduce((s, r) => s + r.shots, 0);
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
    <div className="screen golf-results-screen">
      {/* Player name */}
      <p className="results-player-name">{playerName ? `${playerName}'s Score` : 'Your Score'}</p>

      {/* Primary — big total shots */}
      <div className="golf-results-headline">
        <p className="golf-results-title">Total Shots</p>
        <div className="golf-total-block">
          <span className="golf-total-shots">{total}</span>
        </div>
        <p className="golf-results-subtitle">Lower is better.</p>
      </div>

      <p className="score-message">{message}</p>

      {/* Per-course breakdown — clean list */}
      <div className="golf-course-list">
        {rounds.map((r, i) => (
          <div key={i} className="golf-course-list-row">
            <span className="golf-course-list-num">
              {i + 1}
            </span>
            <span className="golf-course-list-name">{r.courseName}</span>
            <span className="golf-course-list-shots">
              {r.shots === 1 ? '1 shot ⛳' : `${r.shots} shots`}
            </span>
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

      {roomContext && (
        <RoomSubmitPanel
          roomContext={roomContext}
          mode="Golf Mode"
          scoreValue={total}
          scoreLabel={`${total} shots`}
          scoreType="lower_is_better"
          onBackToRoom={onExit}
        />
      )}
    </div>
  );
}
