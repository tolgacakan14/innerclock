import { useState } from 'react';
import type { GolfRoundResult } from '../types';
import { golfCourses }           from '../data/golfCourses';
import GolfIntroScreen            from './GolfIntroScreen';
import GolfGameScreen             from './GolfGameScreen';
import GolfRoundCompleteScreen    from './GolfRoundCompleteScreen';
import GolfResultsScreen          from './GolfResultsScreen';

type GolfScreen = 'intro' | 'playing' | 'roundComplete' | 'results';

interface Props {
  playerName: string;
  onExit:     () => void;
}

/** Pick n unique items from an array at random */
function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr].sort(() => Math.random() - 0.5);
  return copy.slice(0, n);
}

export default function GolfGame({ playerName, onExit }: Props) {
  const [screen,       setScreen]       = useState<GolfScreen>('intro');
  const [selected,     setSelected]     = useState(() => pickRandom(golfCourses, 5));
  const [currentRound, setCurrentRound] = useState(0);   // 0–4
  const [roundResults, setRoundResults] = useState<GolfRoundResult[]>([]);
  const [lastShots,    setLastShots]    = useState(0);   // shots for the just-completed round
  const [playCount,    setPlayCount]    = useState(0);   // increments each new game — forces remount

  // ── Transitions ───────────────────────────────────────────────────────────

  function handleStart() {
    setSelected(pickRandom(golfCourses, 5));
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
    setSelected(pickRandom(golfCourses, 5));
    setCurrentRound(0);
    setRoundResults([]);
    setPlayCount(c => c + 1);
    setScreen('playing');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {screen === 'intro' && (
        <GolfIntroScreen
          onStart={handleStart}
          onBack={onExit}
        />
      )}

      {screen === 'playing' && (
        <GolfGameScreen
          key={`golf-${playCount}-${currentRound}`}
          course={selected[currentRound]}
          courseIndex={currentRound}
          onComplete={handleRoundComplete}
          onHome={onExit}
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
          onExit={onExit}
        />
      )}
    </>
  );
}
