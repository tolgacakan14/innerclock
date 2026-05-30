import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoomContext } from '../types';
import { submitRoomScore, type ScoreType } from '../lib/roomScores';

interface Props {
  roomContext: RoomContext;
  mode:        string;
  scoreValue:  number;
  scoreLabel:  string;
  scoreType:   ScoreType;
  onBackToRoom: () => void;   // calls parent's onExit → returns to room lobby
}

type SubmitState = 'idle' | 'submitting' | 'done' | 'error';

export default function RoomSubmitPanel({
  roomContext, mode, scoreValue, scoreLabel, scoreType, onBackToRoom,
}: Props) {
  const navigate = useNavigate();
  const [state,   setState]   = useState<SubmitState>('idle');
  const [errMsg,  setErrMsg]  = useState('');

  async function handleSubmit() {
    setState('submitting');
    setErrMsg('');
    try {
      await submitRoomScore({
        roomId:      roomContext.roomId,
        playerId:    roomContext.playerId,
        playerName:  roomContext.playerName,
        mode,
        scoreValue,
        scoreLabel,
        scoreType,
        roundId:     roomContext.roundId,
        roundNumber: roomContext.roundNumber,
      });
      setState('done');
    } catch (e) {
      setState('error');
      setErrMsg(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  function handleViewScoreboard() {
    navigate(`/room/${roomContext.roomCode}/scoreboard`);
  }

  return (
    <div className="room-submit-panel">
      <div className="room-submit-panel-header">
        <span className="room-submit-icon">🏆</span>
        <span className="room-submit-room-name">{roomContext.roomName}</span>
        <span className="room-submit-code">#{roomContext.roomCode}</span>
      </div>

      {state === 'idle' && (
        <button className="btn-primary room-submit-btn" onClick={handleSubmit}>
          Submit to Room Leaderboard
        </button>
      )}

      {state === 'submitting' && (
        <button className="btn-primary room-submit-btn" disabled>
          Submitting…
        </button>
      )}

      {state === 'error' && (
        <div className="room-submit-error">
          <p className="room-submit-error-msg">{errMsg}</p>
          <button className="btn-secondary" onClick={handleSubmit}>
            Retry
          </button>
        </div>
      )}

      {state === 'done' && (
        <div className="room-submit-success">
          <p className="room-submit-success-label">✓ Score submitted</p>
          <div className="room-submit-after-btns">
            <button className="btn-primary" onClick={handleViewScoreboard}>
              View Leaderboard
            </button>
            <button className="btn-ghost" onClick={onBackToRoom}>
              ← Back to Room
            </button>
          </div>
        </div>
      )}

      {state !== 'done' && (
        <button className="btn-ghost room-submit-back" onClick={onBackToRoom}>
          ← Back to Room
        </button>
      )}
    </div>
  );
}
