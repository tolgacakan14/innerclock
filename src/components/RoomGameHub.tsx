import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { RoomContext }         from '../types';
import { supabase }                 from '../lib/supabase';
import { loadRoomPlayer, clearRoomPlayer } from '../lib/roomStorage';
import RoomLobbyScreen   from './RoomLobbyScreen';
import JoinRoomScreen    from './JoinRoomScreen';
import RoomFinalScreen   from './RoomFinalScreen';
import TimeGame          from './TimeGame';
import ColorGame         from './ColorGame';
import RushGame          from './RushGame';
import GolfGame          from './GolfGame';
import GrandmaGame       from './GrandmaGame';
import ArrowEscapeGame   from './ArrowEscapeGame';
import SequenceTapGame   from './SequenceTapGame';
import MemoryGridGame    from './MemoryGridGame';
import TapTimingGame     from './TapTimingGame';

type HubView =
  | 'loading'
  | 'not-found'
  | 'setup'
  | 'lobby'
  | 'final'
  | 'time'
  | 'color'
  | 'rush'
  | 'golf'
  | 'grandma'
  | 'arrowEscape'
  | 'sequence'
  | 'memory'
  | 'timing';

export default function RoomGameHub() {
  const { roomCode }  = useParams<{ roomCode: string }>();
  const navigate      = useNavigate();

  // Normalize the code: trim, uppercase, remove all whitespace
  const normalizedCode = (roomCode ?? '').trim().toUpperCase().replace(/\s+/g, '');

  const [view,    setView]    = useState<HubView>('loading');
  const [roomCtx, setRoomCtx] = useState<RoomContext | null>(null);

  // Active party round context (cleared when returning to lobby)
  const [roundId,     setRoundId]     = useState<string | undefined>();
  const [roundNumber, setRoundNumber] = useState<number | undefined>();

  // ── Bootstrap: validate room then decide view ──────────────────────────────
  useEffect(() => {
    console.log('[RoomHub] route roomCode', roomCode);
    console.log('[RoomHub] normalized roomCode', normalizedCode);

    if (!normalizedCode) {
      console.warn('[RoomHub] empty room code — showing not-found');
      setView('not-found');
      return;
    }

    (async () => {
      // 1. Always verify room exists in Supabase (don't trust URL alone)
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('id, room_code, room_name')
        .eq('room_code', normalizedCode)
        .single();

      console.log('[RoomHub] room fetch result', room);
      if (roomErr) console.error('[RoomHub] room fetch error', roomErr);

      if (roomErr || !room) {
        setView('not-found');
        return;
      }

      // 2. Check localStorage for an existing player context
      const saved = loadRoomPlayer(normalizedCode);

      if (saved && saved.roomId === room.id) {
        // 3. Validate saved player still exists in the DB
        const { data: playerCheck, error: playerErr } = await supabase
          .from('players')
          .select('id')
          .eq('id', saved.playerId)
          .single();

        if (playerErr) {
          console.warn('[RoomHub] saved player validation failed — forcing re-join', playerErr);
        }

        if (playerCheck) {
          // Player is valid — go straight to lobby
          console.log('[RoomHub] valid saved session found, entering lobby');
          setRoomCtx(saved);
          setView('lobby');
          return;
        }

        // Player row is gone — clear stale cache and re-join
        console.warn('[RoomHub] stale player in localStorage — clearing and re-joining');
        clearRoomPlayer(normalizedCode);
      } else if (saved) {
        // Saved context is for a different room — clear it
        console.warn('[RoomHub] localStorage roomId mismatch — clearing');
        clearRoomPlayer(normalizedCode);
      }

      // No valid session — show join form
      setView('setup');
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedCode]);

  // ── After JoinRoomScreen completes ────────────────────────────────────────
  function handleSetupDone() {
    const saved = loadRoomPlayer(normalizedCode);
    if (saved) {
      setRoomCtx(saved);
      setView('lobby');
    } else {
      setView('not-found');
    }
  }

  // ── Leave room ─────────────────────────────────────────────────────────────
  function handleLeave() {
    clearRoomPlayer(normalizedCode);
    navigate('/');
  }

  // ── Return to lobby (from any game) ───────────────────────────────────────
  function exitToLobby() {
    setRoundId(undefined);
    setRoundNumber(undefined);
    setView('lobby');
  }

  // ── Start a game mode (free-play or party round) ───────────────────────────
  function handlePlayMode(
    mode: HubView,
    rid?: string,
    rNum?: number,
  ) {
    setRoundId(rid);
    setRoundNumber(rNum);
    setView(mode);
  }

  // ── Build room context with optional round fields ─────────────────────────
  const ctxWithRound: RoomContext | undefined = roomCtx
    ? { ...roomCtx, roundId, roundNumber }
    : undefined;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <div className="screen room-loading-screen">
        <div className="room-loading-spinner" aria-label="Loading room…" />
        <p className="room-loading-text">Loading room…</p>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (view === 'not-found') {
    return (
      <div className="screen room-notfound-screen">
        <span className="room-notfound-icon">🔍</span>
        <h2 className="room-notfound-title">Room not found</h2>
        <p className="room-notfound-sub">
          The code <strong>{normalizedCode}</strong> doesn't match any active room.
        </p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </div>
    );
  }

  // ── Setup ─────────────────────────────────────────────────────────────────
  if (view === 'setup') {
    return (
      <JoinRoomScreen
        initialCode={normalizedCode}
        onBack={() => navigate('/')}
        onJoined={handleSetupDone}
      />
    );
  }

  if (!roomCtx) return null;

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (view === 'lobby') {
    return (
      <RoomLobbyScreen
        roomCtx={roomCtx}
        onPlayMode={(mode, rid, rNum) => handlePlayMode(mode as HubView, rid, rNum)}
        onLeave={handleLeave}
      />
    );
  }

  // ── Final results screen ──────────────────────────────────────────────────
  if (view === 'final') {
    return (
      <RoomFinalScreen
        roomCtx={roomCtx}
        onBackToLobby={exitToLobby}
      />
    );
  }

  // ── Game modes ─────────────────────────────────────────────────────────────
  if (view === 'time') {
    return (
      <TimeGame
        key={`rt-${roomCtx.roomCode}-${roundId ?? 'free'}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={ctxWithRound}
      />
    );
  }

  if (view === 'color') {
    return (
      <ColorGame
        key={`rc-${roomCtx.roomCode}-${roundId ?? 'free'}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={ctxWithRound}
      />
    );
  }

  if (view === 'rush') {
    return (
      <RushGame
        key={`rr-${roomCtx.roomCode}-${roundId ?? 'free'}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={ctxWithRound}
      />
    );
  }

  if (view === 'golf') {
    return (
      <GolfGame
        key={`rg-${roomCtx.roomCode}-${roundId ?? 'free'}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={ctxWithRound}
      />
    );
  }

  if (view === 'grandma') {
    return (
      <GrandmaGame
        key={`rgm-${roomCtx.roomCode}-${roundId ?? 'free'}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={ctxWithRound}
      />
    );
  }

  if (view === 'arrowEscape') {
    return (
      <ArrowEscapeGame
        key={`rae-${roomCtx.roomCode}-${roundId ?? 'free'}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={ctxWithRound}
      />
    );
  }

  if (view === 'sequence') {
    return (
      <SequenceTapGame
        key={`rs-${roomCtx.roomCode}-${roundId ?? 'free'}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={ctxWithRound}
      />
    );
  }

  if (view === 'memory') {
    return (
      <MemoryGridGame
        key={`rm-${roomCtx.roomCode}-${roundId ?? 'free'}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={ctxWithRound}
      />
    );
  }

  if (view === 'timing') {
    return (
      <TapTimingGame
        key={`rtt-${roomCtx.roomCode}-${roundId ?? 'free'}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={ctxWithRound}
      />
    );
  }

  return null;
}
