import { useEffect } from 'react';
import type { DailyGameResult } from '../lib/dailyChallenge';
import { MODE_LABELS_FULL } from '../lib/roomRounds';

interface Props {
  justCompleted: DailyGameResult;
  nextMode:      string | null;   // null = this was the last game
  gameIndex:     number;          // 0-based index of the game that just finished
  totalGames:    number;
  onContinue:    () => void;
}

const AUTO_ADVANCE_MS = 3000;

// Dot-progress bar
function ProgressDots({ total, done }: { total: number; done: number }) {
  return (
    <div className="dc-transition-dots" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={[
            'dc-transition-dot',
            i < done  ? 'dc-transition-dot--done' : '',
            i === done - 1 ? 'dc-transition-dot--just' : '',
          ].filter(Boolean).join(' ')}
        />
      ))}
    </div>
  );
}

export default function DailyChallengeTransitionScreen({
  justCompleted,
  nextMode,
  gameIndex,
  totalGames,
  onContinue,
}: Props) {
  const isLast = nextMode === null;

  // Auto-advance after a few seconds
  useEffect(() => {
    const t = setTimeout(onContinue, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [onContinue]);

  const gameName  = MODE_LABELS_FULL[justCompleted.mode] ?? justCompleted.mode;
  const nextName  = nextMode ? (MODE_LABELS_FULL[nextMode] ?? nextMode) : null;

  return (
    <div
      className="screen dc-transition-screen"
      onClick={onContinue}
      role="button"
      aria-label="Tap to continue"
    >
      {/* Check mark */}
      <div className="dc-transition-check" aria-hidden="true">✓</div>

      {/* Completed game */}
      <div className="dc-transition-game-done">
        <p className="dc-transition-mode-name">{gameName}</p>
        <p className="dc-transition-raw-label">{justCompleted.label}</p>
        <div className="dc-transition-pts-pill">
          +{justCompleted.normalizedScore} / 100 pts
        </div>
      </div>

      {/* Next game */}
      <div className="dc-transition-next-wrap">
        {isLast ? (
          <p className="dc-transition-last">All 5 games complete!</p>
        ) : (
          <>
            <p className="dc-transition-next-label">Up next</p>
            <p className="dc-transition-next-name">{nextName}</p>
          </>
        )}
      </div>

      {/* Progress */}
      <ProgressDots total={totalGames} done={gameIndex + 1} />
      <p className="dc-transition-progress-text">
        Game {gameIndex + 1} of {totalGames}
      </p>

      <p className="dc-transition-hint">Tap to continue</p>
    </div>
  );
}
