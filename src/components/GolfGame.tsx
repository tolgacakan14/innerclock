import { useState, useEffect } from 'react';
import type { GolfRoundResult, RoomContext } from '../types';
import { golfCourses }           from '../data/golfCourses';
import { useBackgroundMusic }    from '../hooks/useBackgroundMusic';
import { makeGameRng }           from '../utils';
import GolfIntroScreen            from './GolfIntroScreen';
import GolfGameScreen             from './GolfGameScreen';
import GolfRoundCompleteScreen    from './GolfRoundCompleteScreen';
import GolfResultsScreen          from './GolfResultsScreen';

type GolfScreen = 'intro' | 'playing' | 'roundComplete' | 'results';

interface Props {
  playerName:   string;
  onExit:       () => void;
  roomContext?: RoomContext;
}

/** Pick n unique items from an array using provided RNG (defaults to Math.random) */
function pickRandom<T>(arr: T[], n: number, rng: () => number = Math.random): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function GolfGame({ playerName, onExit, roomContext }: Props) {
  const { setTrack }           = useBackgroundMusic();
  // In room mode: skip intro → go straight to playing, start golf music immediately
  const [screen,       setScreen]       = useState<GolfScreen>(roomContext ? 'playing' : 'intro');
  useEffect(() => { if (roomContext) setTrack('golf'); }, []);
  const [selected,     setSelected]     = useState(() => pickRandom(golfCourses, 5, makeGameRng(roomContext, 'golf')));
  const [currentRound, setCurrentRound] = useState(0);   // 0–4
  const [roundResults, setRoundResults] = useState<GolfRoundResult[]>([]);
  const [lastShots,    setLastShots]    = useState(0);   // shots for the just-completed round
  const [playCount,    setPlayCount]    = useState(0);   // increments each new game — forces remount

  // ── Transitions ───────────────────────────────────────────────────────────

  function handleStart() {
    setTrack('golf');
    setSelected(pickRandom(golfCourses, 5, makeGameRng(roomContext, 'golf')));
    setCurrentRound(0);
    setRoundResults([]);
    setPlayCount(c => c + 1);
    setScreen('playing');
  }

  function handleRoundComplete(shots: number) {
    const course = selected[currentRound];
    const result: GolfRoundResult = {
      courseId:   course.id,
      courseName: course.name,
      par:        course.par,
      shots,
    };
    setLastShots(shots);
    setRoundResults(prev => [...prev, result]);
    setScreen('roundComplete');
  }

  function handleNextRound() {
    if (currentRound + 1 >= 5) {
      setScreen('results');
    } else {
      setCurrentRound(prev => prev + 1);
      setScreen('playing');
    }
  }

  function handlePlayAgain() {
    setTrack('golf');
    setSelected(pickRandom(golfCourses, 5, makeGameRng(roomContext, 'golf')));
    setCurrentRound(0);
    setRoundResults([]);
    setPlayCount(c => c + 1);
    setScreen('playing');
  }

  function handleExit() {
    setTrack('main');
    onExit();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {screen === 'intro' && (
        <GolfIntroScreen
          onStart={handleStart}
          onBack={handleExit}
        />
      )}

      {screen === 'playing' && (
        <GolfGameScreen
          key={`golf-${playCount}-${currentRound}`}
          course={selected[currentRound]}
          courseIndex={currentRound}
          onComplete={handleRoundComplete}
          onHome={handleExit}
        />
      )}

      {screen === 'roundComplete' && (
        <GolfRoundCompleteScreen
          key={`rc-${currentRound}`}
          courseIndex={currentRound}
          courseName={selected[currentRound].name}
          shots={lastShots}
          onNext={handleNextRound}
        />
      )}

      {screen === 'results' && (
        <GolfResultsScreen
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
