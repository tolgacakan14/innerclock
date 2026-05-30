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
  const code          = (roomCode ?? '').toUpperCase();

  const [view,    setView]    = useState<HubView>('loading');
  const [roomCtx, setRoomCtx] = useState<RoomContext | null>(null);

  // Active party round context (cleared when returning to lobby)
  const [roundId,     setRoundId]     = useState<string | undefined>();
  const [roundNumber, setRoundNumber] = useState<number | undefined>();

  // ── Bootstrap: load or fetch room ─────────────────────────────────────────
  useEffect(() => {
    if (!code) { setView('not-found'); return; }

    const saved = loadRoomPlayer(code);
    if (saved) {
      setRoomCtx(saved);
      setView('lobby');
      return;
    }

    (async () => {
      const { data: room, error } = await supabase
        .from('rooms')
        .select('id, room_code, room_name')
        .eq('room_code', code)
        .single();

      if (error || !room) {
        console.error('[RoomGameHub] room check error:', error);
        setView('not-found');
        return;
      }

      console.log('[RoomGameHub] room confirmed:', room.room_code);
      setView('setup');
    })();
  }, [code]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── After JoinRoomScreen completes ────────────────────────────────────────
  function handleSetupDone() {
    const saved = loadRoomPlayer(code);
    if (saved) {
      setRoomCtx(saved);
      setView('lobby');
    } else {
      setView('not-found');
    }
  }

  // ── Leave room ─────────────────────────────────────────────────────────────
  function handleLeave() {
    clearRoomPlayer(code);
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
        <p className="room-loading-text">Joining room…</p>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (view === 'not-found') {
    return (
      <div className="screen room-notfound-screen">
        <span className="room-notfound-icon">🔍</span>
        <h2 className="room-notfound-title">Room not found</h2>
        <p className="room-notfound-sub">The code <strong>{code}</strong> doesn't match any active room.</p>
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
        initialCode={code}
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
        key={`rt-${roomCtx.roomCode}-${roundId ?? 'free'}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={ctxWithRound}
      />
    );
  }

  return null;
}
