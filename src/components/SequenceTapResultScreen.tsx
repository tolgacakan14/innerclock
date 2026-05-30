import type { RoomContext } from '../types';
import RoomSubmitPanel from './RoomSubmitPanel';

interface Props {
  completedLevels:   number;
  maxSequenceLength: number;
  score:             number;
  playerName:        string;
  onPlayAgain:       () => void;
  onExit:            () => void;
  roomContext?:      RoomContext;
}

function getMessage(score: number): string {
  if (score >= 200) return 'Flawless pattern memory.';
  if (score >= 130) return 'Impressive recall.';
  if (score >= 80)  return 'Good concentration.';
  if (score >= 40)  return 'Keep practising.';
  return 'Sequences are tricky — try again!';
}

export default function SequenceTapResultScreen({
  completedLevels, maxSequenceLength, score, playerName, onPlayAgain, onExit, roomContext,
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
          <span>Levels completed</span>
          <span>{completedLevels} × 10 = {completedLevels * 10} pts</span>
        </div>
        <div className="feedback-row">
          <span>Max sequence length</span>
          <span>{maxSequenceLength} × 5 = {maxSequenceLength * 5} pts</span>
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
          mode="Sequence Tap"
          scoreValue={score}
          scoreLabel={`${score} pts`}
          scoreType="higher_is_better"
          onBackToRoom={onExit}
        />
      )}
    </div>
  );
}
