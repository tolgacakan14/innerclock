import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import type { RoomContext }    from '../types';
import { getRoomScores, type ScoreRow } from '../lib/roomScores';
import { clearRoomPlayer }     from '../lib/roomStorage';

type GameMode = 'time' | 'color' | 'rush' | 'golf' | 'grandma' | 'arrowEscape';

interface Props {
  roomCtx:    RoomContext;
  onPlayMode: (mode: GameMode) => void;
  onLeave:    () => void;
}

const MODES: { id: GameMode; label: string; icon: string; sub: string }[] = [
  { id: 'time',        label: 'Time Mode',      icon: '⏱',  sub: 'Internal clock' },
  { id: 'color',       label: 'Colour Mode',    icon: '🎨',  sub: 'Colour memory' },
  { id: 'rush',        label: 'Rush Mode',      icon: '⚡',  sub: 'Tap reaction' },
  { id: 'golf',        label: 'Golf Mode',      icon: '⛳',  sub: 'Precision shot' },
  { id: 'grandma',     label: 'Grandma',        icon: '👵',  sub: 'Survival run' },
  { id: 'arrowEscape', label: 'Arrow Escape',   icon: '🏹',  sub: 'Logic puzzle' },
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function RoomLobbyScreen({ roomCtx, onPlayMode, onLeave }: Props) {
  const navigate = useNavigate();
  const [copied, setCopied]     = useState(false);
  const [scores, setScores]     = useState<ScoreRow[]>([]);
  const [loading, setLoading]   = useState(true);

  const inviteUrl = `${window.location.origin}/room/${roomCtx.roomCode}`;

  useEffect(() => {
    let cancelled = false;
    getRoomScores(roomCtx.roomId)
      .then(data => { if (!cancelled) { setScores(data.slice(0, 5)); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roomCtx.roomId]);

  function handleCopyLink() {
    navigator.clipboard.writeText(inviteUrl).catch(() => {
      const el = document.createElement('textarea');
      el.value = inviteUrl;
      el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLeave() {
    clearRoomPlayer(roomCtx.roomCode);
    onLeave();
  }

  return (
    <div className="screen room-lobby-screen">
      {/* Header */}
      <div className="room-lobby-header">
        <div className="room-lobby-meta">
          <h2 className="room-lobby-name">{roomCtx.roomName}</h2>
          <div className="room-lobby-code-row">
            <span className="room-lobby-code">{roomCtx.roomCode}</span>
            <button
              className={`room-copy-btn${copied ? ' room-copy-btn--done' : ''}`}
              onClick={handleCopyLink}
              aria-label="Copy invite link"
            >
              {copied ? '✓ Copied' : '⎘ Invite'}
            </button>
          </div>
          <p className="room-lobby-player">Playing as <strong>{roomCtx.playerName}</strong></p>
        </div>
      </div>

      {/* Mode cards */}
      <p className="room-lobby-section-title">Choose a game</p>
      <div className="room-lobby-modes">
        {MODES.map(m => (
          <button
            key={m.id}
            className="room-lobby-mode-card"
            onClick={() => onPlayMode(m.id)}
          >
            <span className="room-mode-icon">{m.icon}</span>
            <span className="room-mode-label">{m.label}</span>
            <span className="room-mode-sub">{m.sub}</span>
          </button>
        ))}
      </div>

      {/* Recent scores preview */}
      <div className="room-lobby-scores-preview">
        <div className="room-lobby-scores-header">
          <p className="room-lobby-section-title" style={{ margin: 0 }}>Recent scores</p>
          <button
            className="btn-ghost room-lobby-full-board-btn"
            onClick={() => navigate(`/room/${roomCtx.roomCode}/scoreboard`)}
          >
            Full scoreboard →
          </button>
        </div>

        {loading && <p className="room-preview-empty">Loading…</p>}
        {!loading && scores.length === 0 && (
          <p className="room-preview-empty">No scores yet — be the first!</p>
        )}
        {!loading && scores.length > 0 && (
          <div className="room-preview-list">
            {scores.map(s => (
              <div key={s.id} className="room-preview-row">
                <span className="room-preview-player">{s.player_name}</span>
                <span className="room-preview-mode">{s.mode}</span>
                <span className="room-preview-score">{s.score_label}</span>
                <span className="room-preview-time">{fmtDate(s.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="room-lobby-footer">
        <button className="btn-ghost" onClick={handleLeave}>
          Leave Room
        </button>
      </div>
    </div>
  );
}
