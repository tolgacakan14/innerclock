import { useState, useEffect } from 'react';
import { useBackgroundMusic }      from '../hooks/useBackgroundMusic';
import SequenceTapGameScreen       from './SequenceTapGameScreen';
import SequenceTapResultScreen     from './SequenceTapResultScreen';

type Screen = 'playing' | 'results';

interface Props {
  playerName:   string;
  onExit:       () => void;
  roomContext?: import('../types').RoomContext;
}

export default function SequenceTapGame({ playerName, onExit, roomContext }: Props) {
  const { setTrack }   = useBackgroundMusic();
  useEffect(() => { setTrack('main'); }, []);
  const [screen,          setScreen]          = useState<Screen>('playing');
  const [completedLevels, setCompletedLevels] = useState(0);
  const [maxSeqLen,       setMaxSeqLen]       = useState(0);
  const [finalScore,      setFinalScore]      = useState(0);

  function handleComplete(completed: number, maxSeq: number, score: number) {
    setCompletedLevels(completed);
    setMaxSeqLen(maxSeq);
    setFinalScore(score);
    setScreen('results');
  }

  function handlePlayAgain() {
    setScreen('playing');
  }

  function handleExit() {
    setTrack('main');
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
          playerName={playerName}
          onPlayAgain={handlePlayAgain}
          onExit={handleExit}
          roomContext={roomContext}
        />
      )}
    </>
  );
}
