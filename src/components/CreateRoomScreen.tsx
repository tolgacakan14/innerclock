import { useState, useRef, useEffect } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { saveRoomPlayer }               from '../lib/roomStorage';

interface Props {
  onBack:    () => void;
  onCreated: (roomCode: string) => void;
}

// ── Room code generator (same charset as roomScores.ts) ───────────────────────
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode(): string {
  return Array.from(
    { length: 7 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('');
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

    // ── Guard: env vars ────────────────────────────────────────────────────
    if (!supabaseConfigured()) {
      setError('Missing Supabase configuration. Check environment variables on Vercel.');
      return;
    }

    const pName = playerName.trim();
    const rName = roomName.trim();
    if (!pName || !rName) return;

    setLoading(true);
    setError('');

    // ── Step 1: insert room (retry up to 5× on duplicate code) ────────────
    let room: { id: string; room_code: string; room_name: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      console.log(`[CreateRoom] attempt ${attempt + 1}, code: ${code}`);

      const { data, error: roomError } = await supabase
        .from('rooms')
        .insert({
          room_code: code,
          room_name: rName,
        })
        .select()
        .single();

      if (roomError) {
        console.error('[CreateRoom] room insert error:', {
          message: roomError.message,
          code:    roomError.code,
          details: roomError.details,
          hint:    roomError.hint,
        });

        const msg = (roomError.message ?? '').toLowerCase();
        // Duplicate room_code — try a different code
        if (msg.includes('duplicate') || msg.includes('unique') || roomError.code === '23505') {
          continue;
        }

        // Any other error — show specific message and stop
        setError(`Could not create room: ${roomError.message ?? roomError.code ?? 'unknown error'}`);
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Could not create room. No data returned from Supabase.');
        setLoading(false);
        return;
      }

      room = data as { id: string; room_code: string; room_name: string };
      break;
    }

    if (!room) {
      setError('Could not generate a unique room code. Please try again.');
      setLoading(false);
      return;
    }

    console.log('[CreateRoom] room created:', room.room_code);

    // ── Step 2: insert creator as first player ─────────────────────────────
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id:     room.id,
        player_name: pName,
      })
      .select()
      .single();

    if (playerError) {
      console.error('[CreateRoom] player insert error:', {
        message: playerError.message,
        code:    playerError.code,
        details: playerError.details,
        hint:    playerError.hint,
      });
      setError(`Could not create player: ${playerError.message ?? playerError.code ?? 'unknown error'}`);
      setLoading(false);
      return;
    }

    if (!player) {
      setError('Could not create player. No data returned from Supabase.');
      setLoading(false);
      return;
    }

    console.log('[CreateRoom] player created:', player.id);

    // ── Step 3: set host_player_id on the room ────────────────────────────
    // Best-effort — non-fatal if this column doesn't exist yet
    const { error: hostErr } = await supabase
      .from('rooms')
      .update({ host_player_id: player.id })
      .eq('id', room.id);
    if (hostErr) {
      console.error('[CreateRoom] host_player_id set failed:', hostErr.message, hostErr.code);
    } else {
      console.log('[CreateRoom] host_player_id set', player.id);
    }

    // ── Step 4: persist locally and navigate ──────────────────────────────
    const ctx = {
      roomId:     room.id,
      roomCode:   room.room_code,
      roomName:   room.room_name,
      playerId:   player.id,
      playerName: player.player_name,
      isHost:     true,   // Stored as fallback for when host_player_id column is missing
    };
    saveRoomPlayer(ctx);
    console.log('[CreateRoom] room created', room);
    console.log('[CreateRoom] creator player created', player);
    localStorage.setItem('kroneName', pName);
    onCreated(room.room_code);
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
