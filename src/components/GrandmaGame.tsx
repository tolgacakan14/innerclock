import { useState } from 'react';
import type { GrandmaRoundResult } from '../types';
import { grandmaPatterns }          from '../data/grandmaPatterns';
import type { GrandmaPattern }       from '../data/grandmaPatterns';
import { useBackgroundMusic }        from '../hooks/useBackgroundMusic';
import GrandmaIntroScreen           from './GrandmaIntroScreen';
import GrandmaGameScreen            from './GrandmaGameScreen';
import GrandmaRoundResultScreen     from './GrandmaRoundResultScreen';
import GrandmaResultsScreen         from './GrandmaResultsScreen';

type GrandmaScreen = 'intro' | 'playing' | 'roundResult' | 'results';

interface Props {
  playerName:   string;
  onExit:       () => void;
  roomContext?: import('../types').RoomContext;
}

/** The single Hot Mode pattern (id 16) */
const HOT_PATTERN = grandmaPatterns.find(p => p.isHot)!;

function pickRandom(arr: GrandmaPattern[], n: number): GrandmaPattern[] {
  // Exclude Hot Mode from the normal random pool
  const pool   = arr.filter(p => !p.isHot);
  const picked = pool.sort(() => Math.random() - 0.5).slice(0, n);
  if (import.meta.env.DEV) {
    const ids   = picked.map(p => p.id);
    const names = picked.map(p => p.name);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) {
      console.warn('⚠️  Grandma: duplicate maps selected!', dupes);
    }
    console.group('%c🏃 Grandma Walking — maps selected', 'font-weight:bold;color:#a0c0f8');
    names.forEach((name, i) => console.log(`  Round ${i + 1}: #${ids[i]} "${name}"`));
    console.groupEnd();
  }
  return picked;
}

export default function GrandmaGame({ playerName, onExit, roomContext }: Props) {
  const { setTrack }               = useBackgroundMusic();
  const [screen,       setScreen]  = useState<GrandmaScreen>('intro');
  const [selected,     setSelected]     = useState(() => pickRandom(grandmaPatterns, 3));
  const [currentRound, setCurrentRound] = useState(0);
  const [roundResults, setRoundResults] = useState<GrandmaRoundResult[]>([]);
  const [lastScore,    setLastScore]    = useState(0);
  const [playCount,    setPlayCount]    = useState(0);

  function handleStart() {
    setTrack('grandma');
    setSelected(pickRandom(grandmaPatterns, 3));
    setCurrentRound(0);
    setRoundResults([]);
    setPlayCount(c => c + 1);
    setScreen('playing');
  }

  function handleHotMode() {
    setTrack('grandma');
    // All 3 rounds use the Hot Mode pattern
    setSelected([HOT_PATTERN, HOT_PATTERN, HOT_PATTERN]);
    setCurrentRound(0);
    setRoundResults([]);
    setPlayCount(c => c + 1);
    setScreen('playing');
  }

  function handleExit() {
    setTrack('main');
    onExit();
  }

  function handleRoundComplete(score: number) {
    const pattern = selected[currentRound];
    setLastScore(score);
    setRoundResults(prev => [
      ...prev,
      { patternId: pattern.id, patternName: pattern.name, score },
    ]);
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
    // If all 3 selected rounds were Hot Mode, keep Hot Mode on replay
    const wasHot = selected.every(p => p.isHot);
    setSelected(wasHot ? [HOT_PATTERN, HOT_PATTERN, HOT_PATTERN] : pickRandom(grandmaPatterns, 3));
    setCurrentRound(0);
    setRoundResults([]);
    setPlayCount(c => c + 1);
    setScreen('playing');
  }

  return (
    <>
      {screen === 'intro' && (
        <GrandmaIntroScreen onStart={handleStart} onBack={handleExit} onHotMode={handleHotMode} />
      )}

      {screen === 'playing' && (
        <GrandmaGameScreen
          key={`grandma-${playCount}-${currentRound}`}
          pattern={selected[currentRound]}
          roundIndex={currentRound}
          onComplete={handleRoundComplete}
          onHome={handleExit}
        />
      )}

      {screen === 'roundResult' && (
        <GrandmaRoundResultScreen
          key={`gr-${currentRound}`}
          roundIndex={currentRound}
          patternName={selected[currentRound].name}
          score={lastScore}
          onNext={handleNextRound}
          onHome={handleExit}
        />
      )}

      {screen === 'results' && (
        <GrandmaResultsScreen
          rounds={roundResults}
          playerName={playerName}
          onPlayAgain={handlePlayAgain}
          onExit={handleExit}
          roomContext={roomContext}
        />
      )}
    </>
  );
}
