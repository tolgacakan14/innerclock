import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NameScreen        from './components/NameScreen';
import ModeSelectScreen  from './components/ModeSelectScreen';
import TimeGame          from './components/TimeGame';
import ColorGame         from './components/ColorGame';
import RushGame          from './components/RushGame';
import GolfGame          from './components/GolfGame';
import GrandmaGame       from './components/GrandmaGame';
import ArrowEscapeGame   from './components/ArrowEscapeGame';
import SequenceTapGame   from './components/SequenceTapGame';
import MemoryGridGame    from './components/MemoryGridGame';
import TapTimingGame     from './components/TapTimingGame';
import CreateRoomScreen  from './components/CreateRoomScreen';
import JoinRoomScreen    from './components/JoinRoomScreen';

type SoloView =
  | 'entry'
  | 'name'
  | 'home'
  | 'create-room'
  | 'join-room'
  | 'time'
  | 'color'
  | 'rush'
  | 'golf'
  | 'grandma'
  | 'arrowEscape'
  | 'sequence'
  | 'memory'
  | 'timing';

export default function SoloApp() {
  const navigate = useNavigate();
  const [view,       setView]       = useState<SoloView>('entry');
  const [playerName, setPlayerName] = useState<string>(
    () => localStorage.getItem('kroneName') ?? '',
  );

  function handleNameConfirm(name: string) {
    setPlayerName(name);
    setView('home');
  }

  // ── Entry screen ───────────────────────────────────────────────────────────
  if (view === 'entry') {
    return (
      <div className="screen home-entry-screen">
        {/* Brand */}
        <div className="name-brand">
          <div className="home-logo-mark" aria-hidden="true">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
              <line x1="24" y1="24" x2="24" y2="8"  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="24" y1="24" x2="34" y2="30" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" />
              <circle cx="24" cy="24" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <h1 className="home-logo name-screen-logo">Krone</h1>
          <p className="home-tagline-perception">Test your perception.</p>
          <p className="home-tagline">Fast games. Real rivalries.</p>
          <p className="home-tagline-sub">Play with friends · Same room · Real competition</p>
        </div>

        {/* Mode selector */}
        <div className="home-entry-options">
          <button
            className="home-entry-card"
            onClick={() => setView(playerName ? 'home' : 'name')}
          >
            <span className="home-entry-card-icon">🎮</span>
            <div className="home-entry-card-body">
              <span className="home-entry-card-title">Solo Play</span>
              <span className="home-entry-card-sub">Play by yourself — no account needed</span>
            </div>
            <span className="home-entry-card-chevron">›</span>
          </button>

          <button
            className="home-entry-card"
            onClick={() => setView('create-room')}
          >
            <span className="home-entry-card-icon">🏠</span>
            <div className="home-entry-card-body">
              <span className="home-entry-card-title">Create Room</span>
              <span className="home-entry-card-sub">Start a room and invite friends</span>
            </div>
            <span className="home-entry-card-chevron">›</span>
          </button>

          <button
            className="home-entry-card"
            onClick={() => setView('join-room')}
          >
            <span className="home-entry-card-icon">🔗</span>
            <div className="home-entry-card-body">
              <span className="home-entry-card-title">Join Room</span>
              <span className="home-entry-card-sub">Enter a room code to compete</span>
            </div>
            <span className="home-entry-card-chevron">›</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Create / Join room ─────────────────────────────────────────────────────
  if (view === 'create-room') {
    return (
      <CreateRoomScreen
        onBack={() => setView('entry')}
        onCreated={(roomCode) => navigate(`/room/${roomCode}`)}
      />
    );
  }

  if (view === 'join-room') {
    return (
      <JoinRoomScreen
        onBack={() => setView('entry')}
        onJoined={(roomCode) => navigate(`/room/${roomCode}`)}
      />
    );
  }

  // ── Solo flow ──────────────────────────────────────────────────────────────
  if (view === 'name') {
    return <NameScreen key="name" onConfirm={handleNameConfirm} />;
  }

  if (view === 'home') {
    return (
      <ModeSelectScreen
        key="home"
        playerName={playerName}
        onSelect={mode => setView(mode as SoloView)}
        onChangeName={() => setView('name')}
        onCreateRoom={() => setView('create-room')}
        onJoinRoom={() => setView('join-room')}
      />
    );
  }

  if (view === 'time') {
    return (
      <TimeGame key="time" playerName={playerName} onExit={() => setView('home')} />
    );
  }

  if (view === 'color') {
    return (
      <ColorGame key="color" playerName={playerName} onExit={() => setView('home')} />
    );
  }

  if (view === 'rush') {
    return (
      <RushGame key="rush" playerName={playerName} onExit={() => setView('home')} />
    );
  }

  if (view === 'golf') {
    return (
      <GolfGame key="golf" playerName={playerName} onExit={() => setView('home')} />
    );
  }

  if (view === 'grandma') {
    return (
      <GrandmaGame key="grandma" playerName={playerName} onExit={() => setView('home')} />
    );
  }

  if (view === 'arrowEscape') {
    return (
      <ArrowEscapeGame key="arrowEscape" playerName={playerName} onExit={() => setView('home')} />
    );
  }

  if (view === 'sequence') {
    return (
      <SequenceTapGame key="sequence" playerName={playerName} onExit={() => setView('home')} />
    );
  }

  if (view === 'memory') {
    return (
      <MemoryGridGame key="memory" playerName={playerName} onExit={() => setView('home')} />
    );
  }

  if (view === 'timing') {
    return (
      <TapTimingGame key="timing" playerName={playerName} onExit={() => setView('home')} />
    );
  }

  return null;
}
