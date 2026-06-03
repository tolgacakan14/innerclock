import { useState, useEffect } from 'react';
import { makeGameRng, makeDailyRng } from '../utils';
import type { GrandmaRoundResult, DailyContext } from '../types';
import { grandmaPatterns }          from '../data/grandmaPatterns';
import type { GrandmaPattern }       from '../data/grandmaPatterns';
import { useBackgroundMusic }        from '../hooks/useBackgroundMusic';
import GrandmaIntroScreen           from './GrandmaIntroScreen';
import GrandmaGameScreen            from './GrandmaGameScreen';
import GrandmaRoundResultScreen     from './GrandmaRoundResultScreen';
import GrandmaResultsScreen         from './GrandmaResultsScreen';

type GrandmaScreen = 'intro' | 'playing' | 'roundResult' | 'results';

interface Props {
  playerName:    string;
  onExit:        () => void;
  roomContext?:  import('../types').RoomContext;
  dailyContext?: DailyContext;
}

/** The single Hot Mode pattern (id 16) */
const HOT_PATTERN = grandmaPatterns.find(p => p.isHot)!;

function pickRandom(arr: GrandmaPattern[], n: number, rng: () => number = Math.random): GrandmaPattern[] {
  // Exclude Hot Mode from the normal random pool
  const pool = arr.filter(p => !p.isHot);
  // Fisher-Yates shuffle with provided RNG
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  const picked = copy.slice(0, n);
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

export default function GrandmaGame({ playerName, onExit, roomContext, dailyContext }: Props) {
  const { setTrack }               = useBackgroundMusic();
  // Room/daily mode: skip intro → go straight to playing, start grandma music
  const [screen,       setScreen]  = useState<GrandmaScreen>(roomContext || dailyContext ? 'playing' : 'intro');
  useEffect(() => { if (roomContext || dailyContext) setTrack('grandma'); }, []);
  // Daily mode: same 3 patterns for all players today
  const [selected,     setSelected]     = useState(() =>
    pickRandom(grandmaPatterns, 3,
      roomContext ? makeGameRng(roomContext, 'grandma') :
      dailyContext ? makeDailyRng('grandma') :
      undefined,
    ),
  );
  const [currentRound, setCurrentRound] = useState(0);
  const [roundResults,      setRoundResults]      = useState<GrandmaRoundResult[]>([]);
  const [lastScore,         setLastScore]         = useState(0);
  const [lastDiedAtLevel,   setLastDiedAtLevel]   = useState('');
  const [playCount,         setPlayCount]         = useState(0);

  function handleStart() {
    setTrack('grandma');
    setSelected(pickRandom(grandmaPatterns, 3, makeGameRng(roomContext, 'grandma')));
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

  function handleRoundComplete(score: number, diedAtLevelName: string) {
    const pattern = selected[currentRound];
    setLastScore(score);
    setLastDiedAtLevel(diedAtLevelName);
    setRoundResults(prev => [
      ...prev,
      { patternId: pattern.id, patternName: pattern.name, score, diedAtLevelName },
    ]);
    setScreen('roundResult');
  }

  function handleNextRound() {
    if (currentRound + 1 >= 3) {
      if (dailyContext) {
        const total = roundResults.reduce((s, r) => s + r.score, 0);
        dailyContext.onComplete(total, `${total} pts`, false);
      } else {
        setScreen('results');
      }
    } else {
      setCurrentRound(prev => prev + 1);
      setScreen('playing');
    }
  }

  function handlePlayAgain() {
    // If all 3 selected rounds were Hot Mode, keep Hot Mode on replay
    const wasHot = selected.every(p => p.isHot);
    setSelected(wasHot ? [HOT_PATTERN, HOT_PATTERN, HOT_PATTERN] : pickRandom(grandmaPatterns, 3, makeGameRng(roomContext, 'grandma')));
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
          score={lastScore}
          diedAtLevelName={lastDiedAtLevel}
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
