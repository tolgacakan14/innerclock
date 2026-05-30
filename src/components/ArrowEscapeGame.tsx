import { useState } from 'react';
import type { ArrowEscapeRoundResult } from '../types';
import { arrowEscapeBoards }          from '../data/arrowEscapeBoards';
import ArrowEscapeIntroScreen         from './ArrowEscapeIntroScreen';
import ArrowEscapeGameScreen          from './ArrowEscapeGameScreen';
import ArrowEscapeRoundResultScreen   from './ArrowEscapeRoundResultScreen';
import ArrowEscapeResultsScreen       from './ArrowEscapeResultsScreen';

type AEScreen = 'intro' | 'playing' | 'roundResult' | 'results';

interface Props {
  playerName: string;
  onExit:     () => void;
}

function pickBoards() {
  const picked = [...arrowEscapeBoards].sort(() => Math.random() - 0.5).slice(0, 5);
  if (import.meta.env.DEV) {
    const ids   = picked.map(b => b.id);
    const names = picked.map(b => b.name);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) console.warn('⚠️  Arrow Escape: duplicate boards!', dupes);
    console.group('%c🏹 Arrow Escape — boards selected', 'font-weight:bold;color:#a8d0ff');
    names.forEach((n, i) => console.log(`  Round ${i + 1}: #${ids[i]} "${n}" [${picked[i].difficulty}]`));
    console.groupEnd();
  }
  return picked;
}

export default function ArrowEscapeGame({ playerName, onExit }: Props) {
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
    if (currentRound + 1 >= 5) {
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
          isLast={currentRound === 4}
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
        />
      )}
    </>
  );
}
