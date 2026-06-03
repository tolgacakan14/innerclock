import type { RoomContext } from '../types';
import RoomSubmitPanel from './RoomSubmitPanel';
import SoloScoreSubmit from './SoloScoreSubmit';

interface Props {
  completedLevels:   number;
  maxSequenceLength: number;
  score:             number;
  elapsedTime?:      number;   // seconds — how long the session lasted
  playerName:        string;
  onPlayAgain:       () => void;
  onExit:            () => void;
  roomContext?:      RoomContext;
}

function getMessage(levels: number): string {
  if (levels >= 15) return 'Flawless pattern memory.';
  if (levels >= 10) return 'Impressive recall.';
  if (levels >= 6)  return 'Good concentration.';
  if (levels >= 3)  return 'Keep practising.';
  return 'Sequences are tricky — try again!';
}

export default function SequenceTapResultScreen({
  completedLevels, maxSequenceLength, elapsedTime, playerName, onPlayAgain, onExit, roomContext,
}: Props) {
  const message = getMessage(completedLevels);

  return (
    <div className="screen results-screen">
      <p className="results-player-name">
        {playerName ? `${playerName}'s Result` : 'Your Result'}
      </p>

      <div className="final-score">
        <span className="score-number">{completedLevels}</span>
        <span className="score-denom">levels</span>
      </div>

      <p className="score-message">{message}</p>

      <div className="feedback-rows">
        <div className="feedback-row">
          <span>Levels completed</span>
          <span>{completedLevels}</span>
        </div>
        <div className="feedback-row">
          <span>Longest sequence</span>
          <span>{maxSequenceLength} taps</span>
        </div>
        {elapsedTime !== undefined && (
          <div className="feedback-row">
            <span>Time played</span>
            <span>{elapsedTime}s</span>
          </div>
        )}
      </div>

      <div className="actions">
        <button className="btn-secondary" onClick={onPlayAgain}>Play Again</button>
        <button className="btn-ghost"     onClick={onExit}>← Home</button>
      </div>

      {roomContext && (
        <RoomSubmitPanel
          roomContext={roomContext}
          mode="Sequence Tap"
          scoreValue={completedLevels}
          scoreLabel={`Level ${completedLevels}`}
          scoreType="higher_is_better"
          onBackToRoom={onExit}
        />
      )}

      {!roomContext && (
        <SoloScoreSubmit
          mode="Sequence Tap"
          scoreValue={completedLevels}
          scoreLabel={`Level ${completedLevels}`}
          scoreType="higher_is_better"
          playerName={playerName}
        />
      )}
    </div>
  );
}
