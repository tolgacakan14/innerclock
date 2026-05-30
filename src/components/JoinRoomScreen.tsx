import { useState, useRef, useEffect } from 'react';
import { supabase }        from '../lib/supabase';
import { saveRoomPlayer }  from '../lib/roomStorage';

interface Props {
  onBack:       () => void;
  onJoined:     (roomCode: string) => void;
  initialCode?: string;   // pre-fill when arriving via direct link
}

function extractMessage(err: unknown): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e.message === 'string' && e.message) return e.message;
    if (typeof e.details === 'string' && e.details) return e.details;
    if (typeof e.code   === 'string' && e.code)    return `Supabase error: ${e.code}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export default function JoinRoomScreen({ onBack, onJoined, initialCode = '' }: Props) {
  const [roomCode,   setRoomCode]   = useState(initialCode.trim().toUpperCase());
  const [playerName, setPlayerName] = useState<string>(
    () => localStorage.getItem('kroneName') ?? '',
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => codeRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // ── 1. Validate env vars ───────────────────────────────────────────────
    if (
      !import.meta.env.VITE_SUPABASE_URL ||
      !import.meta.env.VITE_SUPABASE_ANON_KEY
    ) {
      setError('Missing Supabase configuration. Contact the app owner.');
      return;
    }

    // ── 2. Normalise inputs ────────────────────────────────────────────────
    const normalizedCode = roomCode.trim().toUpperCase().replace(/\s+/g, '');
    const pName          = playerName.trim();

    console.log('[JoinRoom] input code:', roomCode);
    console.log('[JoinRoom] normalized code:', normalizedCode);

    if (!normalizedCode || !pName) return;

    setLoading(true);
    setError('');

    // ── 3. Look up room ────────────────────────────────────────────────────
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', normalizedCode)
      .single();

    if (roomError) {
      console.error('[JoinRoom] room lookup error:', roomError);
      // PGRST116 = "JSON object requested, multiple (or no) rows returned"
      if (roomError.code === 'PGRST116') {
        setError('Room not found. Check the code and try again.');
      } else {
        setError('Could not connect to Supabase. Please try again.');
      }
      setLoading(false);
      return;
    }

    if (!room) {
      console.log('[JoinRoom] room not found (null data)');
      setError('Room not found. Check the code and try again.');
      setLoading(false);
      return;
    }

    console.log('[JoinRoom] room found:', room);

    // ── 4. Insert player ───────────────────────────────────────────────────
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id:     room.id,
        player_name: pName,
      })
      .select()
      .single();

    if (playerError) {
      console.error('[JoinRoom] player insert error:', playerError);
      setError('Could not create player. Please try again.');
      setLoading(false);
      return;
    }

    if (!player) {
      setError('Could not create player. Please try again.');
      setLoading(false);
      return;
    }

    // ── 5. Persist & navigate ──────────────────────────────────────────────
    const ctx = {
      roomId:     room.id,
      roomCode:   normalizedCode,
      roomName:   room.room_name,
      playerId:   player.id,
      playerName: player.player_name,
    };
    saveRoomPlayer(ctx);
    localStorage.setItem('kroneName', pName);
    onJoined(normalizedCode);
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
            onChange={e => setRoomCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
            placeholder="e.g. LNBQTAX"
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
