import { useState } from 'react';
import StartScreen       from './StartScreen';
import CountdownScreen   from './CountdownScreen';
import ObserveScreen     from './ObserveScreen';
import ReproduceScreen   from './ReproduceScreen';
import FeedbackScreen    from './FeedbackScreen';
import TimeResultsScreen from './TimeResultsScreen';
import { calcScore, randomTarget } from '../utils';
import type { Round } from '../types';

type TimeScreen = 'start' | 'countdown' | 'observe' | 'reproduce' | 'feedback' | 'results';

interface Props {
  playerName: string;
  onExit:     () => void;
}

export default function TimeGame({ playerName, onExit }: Props) {
  const [screen,        setScreen]        = useState<TimeScreen>('start');
  const [targets,       setTargets]       = useState<number[]>([]);
  const [rounds,        setRounds]        = useState<Round[]>([]);
  const [currentRound,  setCurrentRound]  = useState(0);
  const [pendingActual, setPendingActual] = useState(0);

  // ── Start: generate 5 hidden target durations ──────────────────────────────
  function handleStart() {
    setTargets(Array.from({ length: 5 }, randomTarget));
    setRounds([]);
    setCurrentRound(0);
    setScreen('countdown');
  }

  function handleCountdownDone() { setScreen('observe'); }
  function handleObserveDone()   { setScreen('reproduce'); }

  function handleReproduce(actual: number) {
    setPendingActual(actual);
    setScreen('feedback');
  }

  function handleNextRound() {
    const target   = targets[currentRound];
    const error    = Math.abs(target - pendingActual);
    const score    = calcScore(error);
    const newRounds: Round[] = [
      ...rounds,
      { target, actual: pendingActual, error, score },
    ];
    setRounds(newRounds);

    if (currentRound + 1 >= 5) {
      setScreen('results');
    } else {
      setCurrentRound(r => r + 1);
      setScreen('countdown');
    }
  }

  const target = targets[currentRound] ?? 0;

  return (
    <>
      {screen === 'start' && (
        <StartScreen onStart={handleStart} onBack={onExit} />
      )}
      {screen === 'countdown' && (
        <CountdownScreen
          key={`cd-${currentRound}`}
          roundIndex={currentRound}
          totalRounds={5}
          onDone={handleCountdownDone}
          onHome={onExit}
        />
      )}
      {screen === 'observe' && (
        <ObserveScreen
          key={`obs-${currentRound}`}
          duration={target}
          roundIndex={currentRound}
          totalRounds={5}
          onDone={handleObserveDone}
          onHome={onExit}
        />
      )}
      {screen === 'reproduce' && (
        <ReproduceScreen
          key={`rep-${currentRound}`}
          roundIndex={currentRound}
          totalRounds={5}
          onComplete={handleReproduce}
          onHome={onExit}
        />
      )}
      {screen === 'feedback' && (
        <FeedbackScreen
          target={target}
          actual={pendingActual}
          roundIndex={currentRound}
          totalRounds={5}
          onNext={handleNextRound}
          onHome={onExit}
        />
      )}
      {screen === 'results' && (
        <TimeResultsScreen
          rounds={rounds}
          playerName={playerName}
          onPlayAgain={handleStart}
          onExit={onExit}
        />
      )}
    </>
  );
}
