import { useState } from 'react';
import type { ArrowEscapeRoundResult } from '../types';
import { arrowEscapeBoards }          from '../data/arrowEscapeBoards';
import ArrowEscapeIntroScreen         from './ArrowEscapeIntroScreen';
import ArrowEscapeGameScreen          from './ArrowEscapeGameScreen';
import ArrowEscapeRoundResultScreen   from './ArrowEscapeRoundResultScreen';
import ArrowEscapeResultsScreen       from './ArrowEscapeResultsScreen';

type AEScreen = 'intro' | 'playing' | 'roundResult' | 'results';

interface Props {
  playerName:   string;
  onExit:       () => void;
  roomContext?: import('../types').RoomContext;
}

/**
 * Pick exactly 3 boards — one from each difficulty tier — always in escalating
 * order: medium → hard → expert.
 * Within each tier, one board is chosen at random so every game feels fresh.
 */
function pickBoards() {
  function rand<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  const medium = arrowEscapeBoards.filter(b => b.difficulty === 'medium');
  const hard   = arrowEscapeBoards.filter(b => b.difficulty === 'hard');
  const expert = arrowEscapeBoards.filter(b => b.difficulty === 'expert');
  const picked = [rand(medium), rand(hard), rand(expert)];

  if (import.meta.env.DEV) {
    const ids   = picked.map(b => b.id);
    const names = picked.map(b => b.name);
    console.group('%c🏹 Arrow Escape — boards selected', 'font-weight:bold;color:#a8d0ff');
    names.forEach((n, i) => console.log(`  Round ${i + 1}: #${ids[i]} "${n}" [${picked[i].difficulty}]`));
    console.groupEnd();
  }
  return picked;
}

export default function ArrowEscapeGame({ playerName, onExit, roomContext }: Props) {
  const [screen,       setScreen]       = useState<AEScreen>('intro');
  const [selected,     setSelected]     = useState(() => pickBoards());
  const [currentRound, setCurrentRound] = useState(0);
  const [roundResults, setRoundResults] = useState<ArrowEscapeRoundResult[]>([]);
  const [lastResult,   setLastResult]   = useState<{ solveTime: number; mistakes: number }>({ solveTime: 0, mistakes: 0 });
  const [playCount,    setPlayCount]    = useState(0);

  function handleStart() {
    setSelected(pickBoards());
    setCurrentRound(0);
    setRoundResults([]);
    setPlayCount(c => c + 1);
    setScreen('playing');
  }

  function handleRoundComplete(solveTime: number, mistakes: number) {
    const board = selected[currentRound];
    setLastResult({ solveTime, mistakes });
    setRoundResults(prev => [...prev, {
      boardId:     board.id,
      boardName:   board.name,
      solveTime,
      mistakes,
      totalArrows: board.arrows.length,
    }]);
    setScreen('roundResult');
  }

  function handleNextRound() {
    if (currentRound + 1 >= 3) {
      setScreen('results');
    } else {
      setCurrentRound(prev => prev + 1);
      setScreen('playing');
    }
  }

  function handlePlayAgain() {
    setSelected(pickBoards());
    setCurrentRound(0);
    setRoundResults([]);
    setPlayCount(c => c + 1);
    setScreen('playing');
  }

  return (
    <>
      {screen === 'intro' && (
        <ArrowEscapeIntroScreen onStart={handleStart} onBack={onExit} />
      )}

      {screen === 'playing' && (
        <ArrowEscapeGameScreen
          key={`ae-${playCount}-${currentRound}`}
          board={selected[currentRound]}
          roundIndex={currentRound}
          onComplete={handleRoundComplete}
          onHome={onExit}
        />
      )}

      {screen === 'roundResult' && (
        <ArrowEscapeRoundResultScreen
          key={`aer-${playCount}-${currentRound}`}
          roundIndex={currentRound}
          boardName={selected[currentRound].name}
          solveTime={lastResult.solveTime}
          mistakes={lastResult.mistakes}
          totalArrows={selected[currentRound].arrows.length}
          isLast={currentRound === 2}
          onNext={handleNextRound}
          onHome={onExit}
        />
      )}

      {screen === 'results' && (
        <ArrowEscapeResultsScreen
          rounds={roundResults}
          playerName={playerName}
          onPlayAgain={handlePlayAgain}
          onExit={onExit}
          roomContext={roomContext}
        />
      )}
    </>
  );
}
