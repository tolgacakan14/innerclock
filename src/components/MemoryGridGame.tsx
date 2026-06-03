import { useState } from 'react';
import { useBackgroundMusic }  from '../hooks/useBackgroundMusic';
import MemoryGridGameScreen    from './MemoryGridGameScreen';
import MemoryGridResultScreen  from './MemoryGridResultScreen';

type Screen = 'playing' | 'results';

interface Props {
  playerName:    string;
  onExit:        () => void;
  roomContext?:  import('../types').RoomContext;
  dailyContext?: import('../types').DailyContext;
}

export default function MemoryGridGame({ playerName, onExit, roomContext, dailyContext }: Props) {
  const { setTrack }      = useBackgroundMusic();
  const [screen,              setScreen]              = useState<Screen>('playing');
  const [completedRounds,     setCompletedRounds]     = useState(0);
  const [totalCorrectCells,   setTotalCorrectCells]   = useState(0);
  const [finalScore,          setFinalScore]          = useState(0);

  function handleComplete(completed: number, correct: number, score: number) {
    setCompletedRounds(completed);
    setTotalCorrectCells(correct);
    setFinalScore(score);
    if (dailyContext) {
      dailyContext.onComplete(score, `${score} pts`, false);
    } else {
      setScreen('results');
    }
  }

  function handlePlayAgain() { setScreen('playing'); }

  function handleExit() {
    setTrack('main');
    onExit();
  }

  return (
    <>
      {screen === 'playing' && (
        <MemoryGridGameScreen
          key={`mg-${finalScore}`}
          onComplete={handleComplete}
          onHome={handleExit}
        />
      )}

      {screen === 'results' && (
        <MemoryGridResultScreen
          completedRounds={completedRounds}
          totalCorrectCells={totalCorrectCells}
          score={finalScore}
          playerName={playerName}
          onPlayAgain={handlePlayAgain}
          onExit={handleExit}
          roomContext={roomContext}
        />
      )}
    </>
  );
}
