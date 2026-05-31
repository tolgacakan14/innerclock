import { useState, useEffect } from 'react';
import type { ArrowEscapeRoundResult } from '../types';
import { arrowEscapeBoards }          from '../data/arrowEscapeBoards';
import { useBackgroundMusic }         from '../hooks/useBackgroundMusic';
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
 * Pick exactly 3 boards for one session.
 * Rounds 1 & 2: two distinct boards from the mediumHard pool (Fisher-Yates,
 * no repeat within the same session).
 * Round 3: one board at random from the finalHard pool.
 */
function pickBoards() {
  const medPool  = arrowEscapeBoards.filter(b => b.difficulty === 'mediumHard');
  const finPool  = arrowEscapeBoards.filter(b => b.difficulty === 'finalHard');

  // Fisher-Yates shuffle a copy so rounds 1 & 2 are always different boards
  const shuffled = [...medPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const r3     = finPool[Math.floor(Math.random() * finPool.length)];
  const picked = [shuffled[0], shuffled[1], r3];

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
  const { setTrack } = useBackgroundMusic();
  useEffect(() => { setTrack('main'); return () => { setTrack('main'); }; }, []);
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
