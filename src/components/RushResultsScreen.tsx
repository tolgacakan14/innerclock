import { useState } from 'react';
import type { RoomContext } from '../types';
import RoomSubmitPanel from './RoomSubmitPanel';
import SoloScoreSubmit from './SoloScoreSubmit';

interface Props {
  score:          number;
  normalHits:     number;
  finalRushHits:  number;
  bonusPoints:    number;
  playerName:     string;
  onPlayAgain:    () => void;
  onExit:         () => void;
  roomContext?:  RoomContext;
}

/**
 * Performance messages based on raw point score.
 * Calibrated for ~2–5 taps/sec over 30 s with double-score final rush.
 */
function getMessage(score: number): string {
  if (score >= 180) return 'Exceptional reflex control.';
  if (score >= 140) return 'Elite tapping rhythm.';
  if (score >= 100) return 'Fast and focused.';
  if (score >= 65)  return 'Solid reaction speed.';
  if (score >= 30)  return 'Warming up.';
  return 'Find your rhythm.';
}

function buildCopyText(
  playerName: string,
  score: number,
  normalHits: number,
  finalRushHits: number,
): string {
  const totalTaps = normalHits + finalRushHits;
  const name = playerName.trim();
  const base = name
    ? `${name} scored ${score} pts in InnerClock Rush Mode (${totalTaps} taps, 30 s).`
    : `I scored ${score} pts in InnerClock Rush Mode (${totalTaps} taps, 30 s).`;
  return `${base} Can you beat it?`;
}

export default function RushResultsScreen({
  score, normalHits, finalRushHits, bonusPoints, playerName, onPlayAgain, onExit, roomContext,
}: Props) {
  const [copied, setCopied] = useState(false);
  const message = getMessage(score);
  const totalTaps = normalHits + finalRushHits;

  function handleCopy() {
    const text = buildCopyText(playerName, score, normalHits, finalRushHits);
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

  const avgPerSec = (totalTaps / 30).toFixed(2);

  return (
    <div className="screen results-screen">
      {/* Player attribution */}
      <p className="results-player-name">
        {playerName ? `${playerName}'s Score` : 'Your Score'}
      </p>

      {/* Primary score */}
      <div className="final-score">
        <span className="score-number">{score}</span>
        <span className="score-denom">pts</span>
      </div>

      <p className="score-message">{message}</p>

      {/* Score breakdown */}
      <div className="feedback-rows">
        <div className="feedback-row">
          <span>Normal hits</span>
          <span>{normalHits} × 1 = {normalHits} pts</span>
        </div>
        <div className="feedback-row">
          <span>Final Rush hits</span>
          <span>{finalRushHits} × 2 = {finalRushHits * 2} pts</span>
        </div>
        {bonusPoints > 0 && (
          <div className="feedback-row">
            <span>Bonus targets</span>
            <span>+{bonusPoints} pts</span>
          </div>
        )}
        <div className="feedback-row rush-results-total-row">
          <span>Total</span>
          <span>{score} pts</span>
        </div>
        <div className="feedback-row">
          <span>Avg per second</span>
          <span>{avgPerSec} taps/s</span>
        </div>
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
          mode="Rush Mode"
          scoreValue={score}
          scoreLabel={`${score} pts`}
          scoreType="higher_is_better"
          onBackToRoom={onExit}
        />
      )}

      {!roomContext && (
        <SoloScoreSubmit
          mode="Rush Mode"
          scoreValue={score}
          scoreLabel={`${score} pts`}
          scoreType="higher_is_better"
          playerName={playerName}
        />
      )}
    </div>
  );
}
