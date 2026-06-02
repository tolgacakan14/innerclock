import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoomContext } from '../types';
import { submitRoomScore, type ScoreType } from '../lib/roomScores';

interface Props {
  roomContext: RoomContext;
  mode:        string;
  scoreValue:  number;
  scoreLabel:  string;
  scoreType:   ScoreType;
  onBackToRoom: () => void;
}

type SubmitState = 'submitting' | 'done' | 'error';

export default function RoomSubmitPanel({
  roomContext, mode, scoreValue, scoreLabel, scoreType, onBackToRoom,
}: Props) {
  const navigate = useNavigate();
  const [state,  setState]  = useState<SubmitState>('submitting');
  const [errMsg, setErrMsg] = useState('');

  // Prevent double-submission (React StrictMode runs effects twice in dev)
  const submittedRef = useRef(false);

  async function doSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
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
      submittedRef.current = false;   // allow retry
      setState('error');
      setErrMsg(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  // Auto-submit on mount — no manual button required
  useEffect(() => { doSubmit(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleViewScoreboard() {
    navigate(`/room/${roomContext.roomCode}/scoreboard`);
  }

  return (
    <div className="room-submit-panel">
      <div className="room-submit-panel-header">
        <span className="room-submit-icon">★</span>
        <span className="room-submit-room-name">{roomContext.roomName}</span>
        <span className="room-submit-code">#{roomContext.roomCode}</span>
      </div>

      {state === 'submitting' && (
        <div className="room-submit-submitting">
          <div className="room-loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
          <p className="room-submit-submitting-label">Submitting score…</p>
        </div>
      )}

      {state === 'error' && (
        <div className="room-submit-error">
          <p className="room-submit-error-msg">{errMsg}</p>
          <button className="btn-secondary" onClick={doSubmit}>
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
