import type { RoomContext } from '../types';
import RoomSubmitPanel from './RoomSubmitPanel';
import SoloScoreSubmit from './SoloScoreSubmit';

interface Props {
  completedRounds:   number;
  totalCorrectCells: number;
  score:             number;
  playerName:        string;
  onPlayAgain:       () => void;
  onExit:            () => void;
  roomContext?:      RoomContext;
}

function getMessage(score: number): string {
  if (score >= 250) return 'Photographic memory!';
  if (score >= 160) return 'Exceptional recall.';
  if (score >= 80)  return 'Sharp focus.';
  if (score >= 40)  return 'Getting warmer.';
  return 'Keep training that memory!';
}

export default function MemoryGridResultScreen({
  completedRounds, totalCorrectCells, score, playerName, onPlayAgain, onExit, roomContext,
}: Props) {
  const message = getMessage(score);

  return (
    <div className="screen results-screen">
      <p className="results-player-name">
        {playerName ? `${playerName}'s Score` : 'Your Score'}
      </p>

      {/* Level-reached badge — the primary achievement metric */}
      <div className="mg-result-level-badge">
        <span className="mg-result-level-num">{completedRounds + 1}</span>
        <span className="mg-result-level-sub">level reached</span>
      </div>

      <div className="final-score">
        <span className="score-number">{score}</span>
        <span className="score-denom">pts</span>
      </div>

      <p className="score-message">{message}</p>

      <div className="feedback-rows">
        <div className="feedback-row">
          <span>Rounds completed</span>
          <span>{completedRounds} × 20 = {completedRounds * 20} pts</span>
        </div>
        <div className="feedback-row">
          <span>Correct cells</span>
          <span>{totalCorrectCells} × 3 = {totalCorrectCells * 3} pts</span>
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
          mode="Memory Grid"
          scoreValue={score}
          scoreLabel={`Level ${completedRounds + 1} — ${score} pts`}
          scoreType="higher_is_better"
          onBackToRoom={onExit}
        />
      )}

      {!roomContext && (
        <SoloScoreSubmit
          mode="Memory Grid"
          scoreValue={score}
          scoreLabel={`Level ${completedRounds + 1} — ${score} pts`}
          scoreType="higher_is_better"
          playerName={playerName}
        />
      )}
    </div>
  );
}
