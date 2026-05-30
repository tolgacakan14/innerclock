import { useState, useRef, useEffect } from 'react';
import { createRoom, createPlayer } from '../lib/roomScores';
import { saveRoomPlayer }           from '../lib/roomStorage';

interface Props {
  onBack:    () => void;
  onCreated: (roomCode: string) => void;
}

export default function CreateRoomScreen({ onBack, onCreated }: Props) {
  const [playerName, setPlayerName] = useState<string>(
    () => localStorage.getItem('kroneName') ?? '',
  );
  const [roomName,   setRoomName]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pName = playerName.trim();
    const rName = roomName.trim();
    if (!pName || !rName) return;

    setLoading(true);
    setError('');

    try {
      const room   = await createRoom(rName);
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
      onCreated(room.room_code);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room. Please try again.');
      setLoading(false);
    }
  }

  const canSubmit = playerName.trim() && roomName.trim() && !loading;

  return (
    <div className="screen room-form-screen">
      <button className="btn-ghost room-form-back" onClick={onBack}>
        ← Back
      </button>

      <div className="room-form-brand">
        <span className="room-form-icon">🏠</span>
        <h2 className="room-form-title">Create a Room</h2>
        <p className="room-form-sub">Invite friends with the room code</p>
      </div>

      <form className="room-form" onSubmit={handleSubmit} noValidate>
        <div className="room-form-field">
          <label className="room-form-label" htmlFor="create-player-name">
            Your name
          </label>
          <input
            ref={nameRef}
            id="create-player-name"
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

        <div className="room-form-field">
          <label className="room-form-label" htmlFor="create-room-name">
            Room name
          </label>
          <input
            id="create-room-name"
            className="room-form-input"
            type="text"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            placeholder="e.g. Friday Night Game"
            maxLength={40}
            autoComplete="off"
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
          {loading ? 'Creating…' : 'Create Room →'}
        </button>
      </form>
    </div>
  );
}
