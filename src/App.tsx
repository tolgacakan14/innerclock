import { useState } from 'react';
import NameScreen       from './components/NameScreen';
import ModeSelectScreen from './components/ModeSelectScreen';
import TimeGame         from './components/TimeGame';
import ColorGame        from './components/ColorGame';
import RushGame         from './components/RushGame';
import GolfGame         from './components/GolfGame';
import GrandmaGame      from './components/GrandmaGame';
import ArrowEscapeGame  from './components/ArrowEscapeGame';

type AppView = 'name' | 'home' | 'time' | 'color' | 'rush' | 'golf' | 'grandma' | 'arrowEscape';

export default function App() {
  const [view,       setView]       = useState<AppView>('name');
  const [playerName, setPlayerName] = useState<string>('');

  function handleNameConfirm(name: string) {
    setPlayerName(name);
    setView('home');
  }

  return (
    <div className="app">
      {view === 'name' && (
        <NameScreen key="name" onConfirm={handleNameConfirm} />
      )}
      {view === 'home' && (
        <ModeSelectScreen
          key="home"
          playerName={playerName}
          onSelect={mode => setView(mode as AppView)}
          onChangeName={() => setView('name')}
        />
      )}
      {view === 'time' && (
        <TimeGame
          key="time"
          playerName={playerName}
          onExit={() => setView('home')}
        />
      )}
      {view === 'color' && (
        <ColorGame
          key="color"
          playerName={playerName}
          onExit={() => setView('home')}
        />
      )}
      {view === 'rush' && (
        <RushGame
          key="rush"
          playerName={playerName}
          onExit={() => setView('home')}
        />
      )}
      {view === 'golf' && (
        <GolfGame
          key="golf"
          playerName={playerName}
          onExit={() => setView('home')}
        />
      )}
      {view === 'grandma' && (
        <GrandmaGame
          key="grandma"
          playerName={playerName}
          onExit={() => setView('home')}
        />
      )}
      {view === 'arrowEscape' && (
        <ArrowEscapeGame
          key="arrowEscape"
          playerName={playerName}
          onExit={() => setView('home')}
        />
      )}
    </div>
  );
}
