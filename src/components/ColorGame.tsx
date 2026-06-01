import { useState } from 'react';
import ColorStartScreen    from './ColorStartScreen';
import ColorObserveScreen  from './ColorObserveScreen';
import ColorMatchScreen    from './ColorMatchScreen';
import ColorFeedbackScreen from './ColorFeedbackScreen';
import ColorResultsScreen  from './ColorResultsScreen';
import { generateDiverseColorSet, calcColorScore, makeGameRng } from '../utils';
import type { TargetColor, ColorRound, RoomContext } from '../types';

type ColorScreen = 'start' | 'observe' | 'match' | 'feedback' | 'results';

interface Props {
  playerName:   string;
  onExit:       () => void;
  roomContext?: RoomContext;
}

export default function ColorGame({ playerName, onExit, roomContext }: Props) {
  const [screen,           setScreen]           = useState<ColorScreen>('start');
  const [targets,          setTargets]          = useState<TargetColor[]>([]);
  const [rounds,           setRounds]           = useState<ColorRound[]>([]);
  const [currentRound,     setCurrentRound]     = useState(0);
  const [pendingSelected,  setPendingSelected]  = useState<TargetColor>({ h: 180, s: 60, l: 50 });

  function handleStart() {
    const rng = makeGameRng(roomContext, 'color');
    setTargets(generateDiverseColorSet(5, rng));
    setRounds([]);
    setCurrentRound(0);
    setScreen('observe');
  }

  function handleObserveDone()           { setScreen('match'); }
  function handleMatch(sel: TargetColor) { setPendingSelected(sel); setScreen('feedback'); }

  function handleNextRound() {
    const target = targets[currentRound];
    const { deltaE, score } = calcColorScore(target, pendingSelected);
    const newRounds: ColorRound[] = [
      ...rounds,
      { target, selected: pendingSelected, deltaE, score },
    ];
    setRounds(newRounds);

    if (currentRound + 1 >= 5) {
      setScreen('results');
    } else {
      setCurrentRound(currentRound + 1);
      setScreen('observe');
    }
  }

  const currentTarget = targets[currentRound];

  return (
    <>
      {screen === 'start' && (
        <ColorStartScreen onStart={handleStart} onBack={onExit} />
      )}
      {screen === 'observe' && currentTarget && (
        <ColorObserveScreen
          key={`cobs-${currentRound}`}
          color={currentTarget}
          roundIndex={currentRound}
          totalRounds={5}
          onDone={handleObserveDone}
          onHome={onExit}
        />
      )}
      {screen === 'match' && (
        <ColorMatchScreen
          key={`cmatch-${currentRound}`}
          roundIndex={currentRound}
          totalRounds={5}
          onSubmit={handleMatch}
          onHome={onExit}
        />
      )}
      {screen === 'feedback' && currentTarget && (
        <ColorFeedbackScreen
          target={currentTarget}
          selected={pendingSelected}
          roundIndex={currentRound}
          totalRounds={5}
          onNext={handleNextRound}
          onHome={onExit}
        />
      )}
      {screen === 'results' && (
        <ColorResultsScreen
          rounds={rounds}
          playerName={playerName}
          onPlayAgain={handleStart}
          onExit={onExit}
          roomContext={roomContext}
        />
      )}
    </>
  );
}
