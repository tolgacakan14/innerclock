import { useMemo, useState } from 'react';
import type { DailyContext }       from '../types';
import { getDailyGames, normalizeScore, type DailyGameResult } from '../lib/dailyChallenge';

import DailyChallengeIntroScreen       from './DailyChallengeIntroScreen';
import DailyChallengeTransitionScreen  from './DailyChallengeTransitionScreen';
import DailyChallengeResultScreen      from './DailyChallengeResultScreen';

import TimeGame        from './TimeGame';
import ColorGame       from './ColorGame';
import RushGame        from './RushGame';
import GolfGame        from './GolfGame';
import GrandmaGame     from './GrandmaGame';
import ArrowEscapeGame from './ArrowEscapeGame';
import SequenceTapGame from './SequenceTapGame';
import MemoryGridGame  from './MemoryGridGame';
import TapTimingGame   from './TapTimingGame';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  playerName: string;
  onExit:     () => void;
}

// ── Phase type ────────────────────────────────────────────────────────────────

type DCPhase = 'intro' | 'playing' | 'transition' | 'result';

// ── Component ─────────────────────────────────────────────────────────────────

export default function DailyChallengeFlow({ playerName, onExit }: Props) {
  const [phase,       setPhase]       = useState<DCPhase>('intro');
  const [gameIndex,   setGameIndex]   = useState(0);
  const [gameResults, setGameResults] = useState<DailyGameResult[]>([]);
  const [lastResult,  setLastResult]  = useState<DailyGameResult | null>(null);

  // The 5-game list is deterministic for today; memoised so it never changes
  // within a session (though getDailyGames is pure anyway).
  const dailyGames = useMemo(() => getDailyGames(), []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Called by the game wrapper when it finishes (instead of showing results). */
  function handleGameComplete(
    rawScore:      number,
    label:         string,
    lowerIsBetter: boolean,
  ) {
    const mode            = dailyGames[gameIndex];
    const normalizedScore = normalizeScore(mode, rawScore, lowerIsBetter);
    const result: DailyGameResult = { mode, rawScore, normalizedScore, label, lowerIsBetter };
    setGameResults(prev => [...prev, result]);
    setLastResult(result);
    setPhase('transition');
  }

  /** Auto/tap advance from the transition screen. */
  function handleTransitionDone() {
    if (gameIndex + 1 >= dailyGames.length) {
      setPhase('result');
    } else {
      setGameIndex(i => i + 1);
      setPhase('playing');
    }
  }

  /** Play Again: keep the same daily games, restart from game 1. */
  function handlePlayAgain() {
    setGameIndex(0);
    setGameResults([]);
    setLastResult(null);
    setPhase('playing');
  }

  // ── Daily context given to each game wrapper ───────────────────────────────
  const dailyCtx: DailyContext = {
    gameIndex,
    totalGames: dailyGames.length,
    onComplete: handleGameComplete,
    onAbort:    onExit,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // 1. Intro
  if (phase === 'intro') {
    return (
      <DailyChallengeIntroScreen
        games={dailyGames}
        playerName={playerName}
        onStart={() => setPhase('playing')}
        onBack={onExit}
      />
    );
  }

  // 2. Playing — render the current game wrapper with dailyContext
  if (phase === 'playing') {
    const mode    = dailyGames[gameIndex];
    const gameKey = `dc-${gameIndex}-${mode}`;

    switch (mode) {
      case 'time':
        return <TimeGame        key={gameKey} playerName={playerName} onExit={onExit} dailyContext={dailyCtx} />;
      case 'color':
        return <ColorGame       key={gameKey} playerName={playerName} onExit={onExit} dailyContext={dailyCtx} />;
      case 'rush':
        return <RushGame        key={gameKey} playerName={playerName} onExit={onExit} dailyContext={dailyCtx} />;
      case 'golf':
        return <GolfGame        key={gameKey} playerName={playerName} onExit={onExit} dailyContext={dailyCtx} />;
      case 'grandma':
        return <GrandmaGame     key={gameKey} playerName={playerName} onExit={onExit} dailyContext={dailyCtx} />;
      case 'arrowEscape':
        return <ArrowEscapeGame key={gameKey} playerName={playerName} onExit={onExit} dailyContext={dailyCtx} />;
      case 'sequence':
        return <SequenceTapGame key={gameKey} playerName={playerName} onExit={onExit} dailyContext={dailyCtx} />;
      case 'memory':
        return <MemoryGridGame  key={gameKey} playerName={playerName} onExit={onExit} dailyContext={dailyCtx} />;
      case 'timing':
        return <TapTimingGame   key={gameKey} playerName={playerName} onExit={onExit} dailyContext={dailyCtx} />;
      default:
        // Fallback: treat as Rush
        return <RushGame key={gameKey} playerName={playerName} onExit={onExit} dailyContext={dailyCtx} />;
    }
  }

  // 3. Transition between games
  if (phase === 'transition' && lastResult) {
    const nextMode = gameIndex + 1 < dailyGames.length
      ? dailyGames[gameIndex + 1]
      : null;
    return (
      <DailyChallengeTransitionScreen
        justCompleted={lastResult}
        nextMode={nextMode}
        gameIndex={gameIndex}
        totalGames={dailyGames.length}
        onContinue={handleTransitionDone}
      />
    );
  }

  // 4. Final result
  if (phase === 'result') {
    const totalScore = gameResults.reduce((s, r) => s + r.normalizedScore, 0);
    return (
      <DailyChallengeResultScreen
        playerName={playerName}
        gameResults={gameResults}
        totalScore={totalScore}
        onPlayAgain={handlePlayAgain}
        onExit={onExit}
      />
    );
  }

  return null;
}
