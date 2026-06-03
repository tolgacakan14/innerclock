import { useState, useEffect } from 'react';
import { useBackgroundMusic }      from '../hooks/useBackgroundMusic';
import { musicManager }            from '../audio';
import SequenceTapGameScreen       from './SequenceTapGameScreen';
import SequenceTapResultScreen     from './SequenceTapResultScreen';

type Screen = 'playing' | 'results';

interface Props {
  playerName:    string;
  onExit:        () => void;
  roomContext?:  import('../types').RoomContext;
  dailyContext?: import('../types').DailyContext;
}

export default function SequenceTapGame({ playerName, onExit, roomContext, dailyContext }: Props) {
  useBackgroundMusic(); // keep subscription alive; no music for Sequence Tap
  useEffect(() => {
    // Sequence Tap uses only tap sounds — silence background music for this game
    musicManager.silence();
    return () => {
      // Restore music when leaving Sequence Tap
      musicManager.unsilence();
    };
  }, []);
  const [screen,          setScreen]          = useState<Screen>('playing');
  const [completedLevels, setCompletedLevels] = useState(0);
  const [maxSeqLen,       setMaxSeqLen]       = useState(0);
  const [finalScore,      setFinalScore]      = useState(0);
  const [elapsedTime,     setElapsedTime]     = useState(0);

  function handleComplete(completed: number, maxSeq: number, score: number, elapsed: number) {
    setCompletedLevels(completed);
    setMaxSeqLen(maxSeq);
    setFinalScore(score);
    setElapsedTime(elapsed);
    if (dailyContext) {
      dailyContext.onComplete(score, `${score} pts`, false);
    } else {
      setScreen('results');
    }
  }

  function handlePlayAgain() {
    setScreen('playing');
  }

  function handleExit() {
    onExit();
  }

  return (
    <>
      {screen === 'playing' && (
        <SequenceTapGameScreen
          key={`seq-${finalScore}`}
          onComplete={handleComplete}
          onHome={handleExit}
        />
      )}

      {screen === 'results' && (
        <SequenceTapResultScreen
          completedLevels={completedLevels}
          maxSequenceLength={maxSeqLen}
          score={finalScore}
          elapsedTime={elapsedTime}
          playerName={playerName}
          onPlayAgain={handlePlayAgain}
          onExit={handleExit}
          roomContext={roomContext}
        />
      )}
    </>
  );
}
