import { useState, useEffect } from 'react';
import { useBackgroundMusic }   from '../hooks/useBackgroundMusic';
import RushIntroScreen          from './RushIntroScreen';
import RushCountdownScreen      from './RushCountdownScreen';
import RushGameScreen           from './RushGameScreen';
import RushScoreRevealScreen    from './RushScoreRevealScreen';
import RushResultsScreen        from './RushResultsScreen';

type RushScreen = 'intro' | 'countdown' | 'playing' | 'reveal' | 'results';

interface Props {
  playerName:   string;
  onExit:       () => void;
  roomContext?: import('../types').RoomContext;
}

export default function RushGame({ playerName, onExit, roomContext }: Props) {
  const { setTrack }                = useBackgroundMusic();
  // In room mode: skip intro + pre-game countdown → go straight to playing
  const [screen,          setScreen]          = useState<RushScreen>(roomContext ? 'playing' : 'intro');
  // Set rush music immediately if starting in room mode (no handleStart called)
  useEffect(() => { if (roomContext) setTrack('rush'); }, []);
  const [finalScore,      setFinalScore]      = useState(0);
  const [finalNormalHits, setFinalNormalHits] = useState(0);
  const [finalRushHits,   setFinalRushHits]   = useState(0);
  const [finalBonusPoints,setFinalBonusPoints]= useState(0);

  // ── Transitions ───────────────────────────────────────────────────────────

  function handleStart() {
    setTrack('rush');
    setScreen('countdown');
  }

  function handleCountdownDone() { setScreen('playing'); }

  function handleComplete(total: number, normalHits: number, rushHits: number, bonusPoints: number) {
    setFinalScore(total);
    setFinalNormalHits(normalHits);
    setFinalRushHits(rushHits);
    setFinalBonusPoints(bonusPoints);
    setScreen('reveal');
  }

  function handleRevealContinue() { setScreen('results'); }

  function handlePlayAgain() { setScreen('countdown'); }

  function handleExit() {
    setTrack('main');
    onExit();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {screen === 'intro' && (
        <RushIntroScreen
          onStart={handleStart}
          onBack={handleExit}
        />
      )}

      {screen === 'countdown' && (
        <RushCountdownScreen
          key={`rcd-${finalScore}`}
          onDone={handleCountdownDone}
          onHome={handleExit}
        />
      )}

      {screen === 'playing' && (
        <RushGameScreen
          key={`rg-${finalScore}`}
          onComplete={handleComplete}
          onHome={handleExit}
        />
      )}

      {screen === 'reveal' && (
        <RushScoreRevealScreen
          totalTaps={finalNormalHits + finalRushHits}
          score={finalScore}
          onContinue={handleRevealContinue}
        />
      )}

      {screen === 'results' && (
        <RushResultsScreen
          score={finalScore}
          normalHits={finalNormalHits}
          finalRushHits={finalRushHits}
          bonusPoints={finalBonusPoints}
          playerName={playerName}
          onPlayAgain={handlePlayAgain}
          onExit={handleExit}
          roomContext={roomContext}
        />
      )}
    </>
  );
}
