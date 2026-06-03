import { useState, useEffect } from 'react';
import StartScreen       from './StartScreen';
import CountdownScreen   from './CountdownScreen';
import ObserveScreen     from './ObserveScreen';
import ReproduceScreen   from './ReproduceScreen';
import FeedbackScreen    from './FeedbackScreen';
import TimeResultsScreen from './TimeResultsScreen';
import { calcScore, randomTarget, makeGameRng, makeDailyRng } from '../utils';
import type { Round, RoomContext, DailyContext } from '../types';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

type TimeScreen = 'start' | 'countdown' | 'observe' | 'reproduce' | 'feedback' | 'results';

interface Props {
  playerName:    string;
  onExit:        () => void;
  roomContext?:  RoomContext;
  dailyContext?: DailyContext;
}

export default function TimeGame({ playerName, onExit, roomContext, dailyContext }: Props) {
  const { setTrack } = useBackgroundMusic();
  useEffect(() => { setTrack('time'); }, []);

  // In room/daily mode skip the start screen — generate targets immediately
  const [targets, setTargets] = useState<number[]>(() => {
    if (roomContext) {
      const rng = makeGameRng(roomContext, 'time');
      return Array.from({ length: 5 }, () => randomTarget(rng));
    }
    if (dailyContext) {
      // Daily: deterministic targets so all players see the same durations today
      const rng = makeDailyRng('time');
      return Array.from({ length: 5 }, () => randomTarget(rng));
    }
    return [];
  });
  const [screen,        setScreen]        = useState<TimeScreen>(roomContext || dailyContext ? 'countdown' : 'start');
  const [rounds,        setRounds]        = useState<Round[]>([]);
  const [currentRound,  setCurrentRound]  = useState(0);
  const [pendingActual, setPendingActual] = useState(0);

  function handleExit() {
    setTrack('main');
    onExit();
  }

  // ── Start: generate 5 hidden target durations ──────────────────────────────
  function handleStart() {
    const rng = makeGameRng(roomContext, 'time');
    setTargets(Array.from({ length: 5 }, () => randomTarget(rng)));
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
      if (dailyContext) {
        const total = newRounds.reduce((s, r) => s + r.score, 0);
        dailyContext.onComplete(total, `${total} / 500`, false);
      } else {
        setScreen('results');
      }
    } else {
      setCurrentRound(r => r + 1);
      setScreen('countdown');
    }
  }

  const target = targets[currentRound] ?? 0;

  return (
    <>
      {screen === 'start' && (
        <StartScreen onStart={handleStart} onBack={handleExit} />
      )}
      {screen === 'countdown' && (
        <CountdownScreen
          key={`cd-${currentRound}`}
          roundIndex={currentRound}
          totalRounds={5}
          onDone={handleCountdownDone}
          onHome={handleExit}
        />
      )}
      {screen === 'observe' && (
        <ObserveScreen
          key={`obs-${currentRound}`}
          duration={target}
          roundIndex={currentRound}
          totalRounds={5}
          onDone={handleObserveDone}
          onHome={handleExit}
        />
      )}
      {screen === 'reproduce' && (
        <ReproduceScreen
          key={`rep-${currentRound}`}
          roundIndex={currentRound}
          totalRounds={5}
          onComplete={handleReproduce}
          onHome={handleExit}
        />
      )}
      {screen === 'feedback' && (
        <FeedbackScreen
          target={target}
          actual={pendingActual}
          roundIndex={currentRound}
          totalRounds={5}
          onNext={handleNextRound}
          onHome={handleExit}
        />
      )}
      {screen === 'results' && (
        <TimeResultsScreen
          rounds={rounds}
          playerName={playerName}
          onPlayAgain={handleStart}
          onExit={handleExit}
          roomContext={roomContext}
        />
      )}
    </>
  );
}
