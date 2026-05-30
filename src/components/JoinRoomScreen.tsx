import { useState, useRef, useEffect } from 'react';
import { getRoomByCode, createPlayer } from '../lib/roomScores';
import { saveRoomPlayer }              from '../lib/roomStorage';

interface Props {
  onBack:   () => void;
  onJoined: (roomCode: string) => void;
  // Pre-fill room code when user lands via direct link
  initialCode?: string;
}

export default function JoinRoomScreen({ onBack, onJoined, initialCode = '' }: Props) {
  const [roomCode,   setRoomCode]   = useState(initialCode.toUpperCase());
  const [playerName, setPlayerName] = useState<string>(
    () => localStorage.getItem('kroneName') ?? '',
  );
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => codeRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code  = roomCode.trim().toUpperCase();
    const pName = playerName.trim();
    if (!code || !pName) return;

    setLoading(true);
    setError('');

    try {
      const room = await getRoomByCode(code);
      if (!room) {
        setError('Room not found. Check the code and try again.');
        setLoading(false);
        return;
      }

      const player = await createPlayer(room.id, pName);

      const ctx = {
        roomId:     room.id,
        roomCode:   room.room_code,
        roomName:   room.room_name,
        playerId:   player.id,
        playerName: pName,
      };
      saveRoomPlayer(ctx);
      localStorage.setItem('kroneName', pName);
      onJoined(room.room_code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  const canSubmit = roomCode.trim() && playerName.trim() && !loading;

  return (
    <div className="screen room-form-screen">
      <button className="btn-ghost room-form-back" onClick={onBack}>
        ← Back
      </button>

      <div className="room-form-brand">
        <span className="room-form-icon">🔗</span>
        <h2 className="room-form-title">Join a Room</h2>
        <p className="room-form-sub">Enter the room code shared with you</p>
      </div>

      <form className="room-form" onSubmit={handleSubmit} noValidate>
        <div className="room-form-field">
          <label className="room-form-label" htmlFor="join-room-code">
            Room code
          </label>
          <input
            ref={codeRef}
            id="join-room-code"
            className="room-form-input room-form-input--code"
            type="text"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. KRONE123"
            maxLength={8}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            disabled={loading}
          />
        </div>

        <div className="room-form-field">
          <label className="room-form-label" htmlFor="join-player-name">
            Your name
          </label>
          <input
            id="join-player-name"
            className="room-form-input"
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={24}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            disabled={loading}
          />
        </div>

        {error && <p className="room-form-error">{error}</p>}

        <button
          type="submit"
          className="btn-primary room-form-submit"
          disabled={!canSubmit}
        >
          {loading ? 'Joining…' : 'Join Room →'}
        </button>
      </form>
    </div>
  );
}
