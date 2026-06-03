import { useState, useEffect } from 'react';
import { useBackgroundMusic }  from '../hooks/useBackgroundMusic';
import TapTimingGameScreen     from './TapTimingGameScreen';
import TapTimingResultScreen   from './TapTimingResultScreen';

type Screen = 'playing' | 'results';

interface Props {
  playerName:    string;
  onExit:        () => void;
  roomContext?:  import('../types').RoomContext;
  dailyContext?: import('../types').DailyContext;
}

export default function TapTimingGame({ playerName, onExit, roomContext, dailyContext }: Props) {
  const { setTrack }   = useBackgroundMusic();
  useEffect(() => { setTrack('main'); }, []);
  const [screen,       setScreen]       = useState<Screen>('playing');
  const [finalPerfects,setFinalPerfects]= useState(0);
  const [finalGoods,   setFinalGoods]   = useState(0);
  const [finalMisses,  setFinalMisses]  = useState(0);
  const [finalMaxCombo,setFinalMaxCombo]= useState(0);
  const [finalScore,   setFinalScore]   = useState(0);

  function handleComplete(
    perfects: number, goods: number, misses: number, maxCombo: number, score: number,
  ) {
    setFinalPerfects(perfects);
    setFinalGoods(goods);
    setFinalMisses(misses);
    setFinalMaxCombo(maxCombo);
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
        <TapTimingGameScreen
          key={`tt-${finalScore}`}
          onComplete={handleComplete}
          onHome={handleExit}
        />
      )}

      {screen === 'results' && (
        <TapTimingResultScreen
          perfects={finalPerfects}
          goods={finalGoods}
          misses={finalMisses}
          maxCombo={finalMaxCombo}
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
