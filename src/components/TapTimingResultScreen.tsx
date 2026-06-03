import type { RoomContext } from '../types';
import RoomSubmitPanel from './RoomSubmitPanel';
import SoloScoreSubmit from './SoloScoreSubmit';

interface Props {
  perfects:    number;
  goods:       number;
  misses:      number;
  maxCombo:    number;
  score:       number;
  playerName:  string;
  onPlayAgain: () => void;
  onExit:      () => void;
  roomContext?: RoomContext;
}

function getMessage(score: number): string {
  if (score >= 400) return 'Legendary timing.';
  if (score >= 250) return 'Precision master.';
  if (score >= 140) return 'Sharp rhythm.';
  if (score >= 70)  return 'On the beat.';
  return 'Keep tapping!';
}

export default function TapTimingResultScreen({
  perfects, goods, misses, maxCombo, score, playerName, onPlayAgain, onExit, roomContext,
}: Props) {
  const message = getMessage(score);

  return (
    <div className="screen results-screen">
      <p className="results-player-name">
        {playerName ? `${playerName}'s Score` : 'Your Score'}
      </p>

      <div className="final-score">
        <span className="score-number">{score}</span>
        <span className="score-denom">pts</span>
      </div>

      <p className="score-message">{message}</p>

      <div className="feedback-rows">
        <div className="feedback-row">
          <span>Perfects</span>
          <span>{perfects} × 10 = {perfects * 10} pts</span>
        </div>
        <div className="feedback-row">
          <span>Goods</span>
          <span>{goods} × 5 = {goods * 5} pts</span>
        </div>
        <div className="feedback-row">
          <span>Misses</span>
          <span>{misses}</span>
        </div>
        <div className="feedback-row">
          <span>Max combo</span>
          <span>x{maxCombo}</span>
        </div>
        <div className="feedback-row rush-results-total-row">
          <span>Total</span>
          <span>{score} pts</span>
        </div>
      </div>

      <div className="actions">
        <button className="btn-secondary" onClick={onPlayAgain}>Play Again</button>
        <button className="btn-ghost"     onClick={onExit}>← Home</button>
      </div>

      {roomContext && (
        <RoomSubmitPanel
          roomContext={roomContext}
          mode="Tap Timing"
          scoreValue={score}
          scoreLabel={`${score} pts`}
          scoreType="higher_is_better"
          onBackToRoom={onExit}
        />
      )}

      {!roomContext && (
        <SoloScoreSubmit
          mode="Tap Timing"
          scoreValue={score}
          scoreLabel={`${score} pts`}
          scoreType="higher_is_better"
          playerName={playerName}
        />
      )}
    </div>
  );
}
