import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { RoomContext }         from '../types';
import { getRoomByCode, createPlayer } from '../lib/roomScores';
import { loadRoomPlayer, saveRoomPlayer, clearRoomPlayer } from '../lib/roomStorage';
import RoomLobbyScreen   from './RoomLobbyScreen';
import JoinRoomScreen    from './JoinRoomScreen';
import TimeGame          from './TimeGame';
import ColorGame         from './ColorGame';
import RushGame          from './RushGame';
import GolfGame          from './GolfGame';
import GrandmaGame       from './GrandmaGame';
import ArrowEscapeGame   from './ArrowEscapeGame';

type HubView =
  | 'loading'
  | 'not-found'
  | 'setup'        // ask player name for this room
  | 'lobby'
  | 'time'
  | 'color'
  | 'rush'
  | 'golf'
  | 'grandma'
  | 'arrowEscape';

export default function RoomGameHub() {
  const { roomCode }  = useParams<{ roomCode: string }>();
  const navigate      = useNavigate();
  const code          = (roomCode ?? '').toUpperCase();

  const [view,       setView]       = useState<HubView>('loading');
  const [roomCtx,    setRoomCtx]    = useState<RoomContext | null>(null);

  // ── Bootstrap: load or fetch room ─────────────────────────────────────────
  useEffect(() => {
    if (!code) { setView('not-found'); return; }

    // Try localStorage first
    const saved = loadRoomPlayer(code);
    if (saved) {
      setRoomCtx(saved);
      setView('lobby');
      return;
    }

    // Fetch room from Supabase to confirm it exists
    getRoomByCode(code)
      .then(room => {
        if (!room) { setView('not-found'); return; }
        // Room exists but no local identity — show setup
        setView('setup');
      })
      .catch(() => setView('not-found'));
  }, [code]);

  // ── Called after JoinRoomScreen completes inside the hub ──────────────────
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

  // ── Setup (ask name) ───────────────────────────────────────────────────────
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

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (view === 'lobby') {
    return (
      <RoomLobbyScreen
        roomCtx={roomCtx}
        onPlayMode={mode => setView(mode)}
        onLeave={handleLeave}
      />
    );
  }

  // ── Game modes (with room context injected) ────────────────────────────────
  const exitToLobby = () => setView('lobby');

  if (view === 'time') {
    return (
      <TimeGame
        key={`rt-${roomCtx.roomCode}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={roomCtx}
      />
    );
  }

  if (view === 'color') {
    return (
      <ColorGame
        key={`rc-${roomCtx.roomCode}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={roomCtx}
      />
    );
  }

  if (view === 'rush') {
    return (
      <RushGame
        key={`rr-${roomCtx.roomCode}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={roomCtx}
      />
    );
  }

  if (view === 'golf') {
    return (
      <GolfGame
        key={`rg-${roomCtx.roomCode}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={roomCtx}
      />
    );
  }

  if (view === 'grandma') {
    return (
      <GrandmaGame
        key={`rgm-${roomCtx.roomCode}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={roomCtx}
      />
    );
  }

  if (view === 'arrowEscape') {
    return (
      <ArrowEscapeGame
        key={`rae-${roomCtx.roomCode}`}
        playerName={roomCtx.playerName}
        onExit={exitToLobby}
        roomContext={roomCtx}
      />
    );
  }

  return null;
}
