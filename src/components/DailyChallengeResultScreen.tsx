import { useEffect, useState } from 'react';
import {
  submitDailyChallengeScore,
  getDailyLeaderboard,
  getAllDailyScores,
  deduplicateLeaderboard,
  formatLocalDate,
  type DailyGameResult,
  type DailyChallengeRecord,
} from '../lib/dailyChallenge';
import { MODE_LABELS_FULL } from '../lib/roomRounds';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  playerName:  string;
  gameResults: DailyGameResult[];
  totalScore:  number;          // sum of normalizedScore, 0–500
  onPlayAgain: () => void;
  onExit:      () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rankIcon(i: number): string {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return `#${i + 1}`;
}

function getMessage(score: number): string {
  if (score >= 450) return 'Legendary run. Unbeatable today.';
  if (score >= 375) return 'Exceptional. Near the top of the board.';
  if (score >= 275) return 'Strong daily performance.';
  if (score >= 175) return 'Solid run. Room to grow.';
  return 'Every day is a chance to improve.';
}

/** Format an ISO timestamp as English 24-hour HH:MM, e.g. "18:42". */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// ── Compact leaderboard row ───────────────────────────────────────────────────

function LBRow({
  record, rank, isMe,
}: { record: DailyChallengeRecord; rank: number; isMe: boolean }) {
  return (
    <div className={[
      'dc-lb-row',
      rank === 0 ? 'dc-lb-row--1st' : rank === 1 ? 'dc-lb-row--2nd' : rank === 2 ? 'dc-lb-row--3rd' : '',
      isMe ? 'dc-lb-row--me' : '',
    ].filter(Boolean).join(' ')}>
      <span className="dc-lb-rank">{rankIcon(rank)}</span>
      <span className="dc-lb-name">
        {record.player_name}{isMe ? ' · you' : ''}
      </span>
      <span className="dc-lb-score">{record.final_score}</span>
      <span className="dc-lb-time">{fmtTime(record.completed_at)}</span>
    </div>
  );
}

// ── All Scores bottom sheet ───────────────────────────────────────────────────

type AllScoresState = 'idle' | 'loading' | 'done' | 'error';

function AllScoresSheet({
  myName,
  onClose,
}: {
  myName: string;
  onClose: () => void;
}) {
  const [state,  setState]  = useState<AllScoresState>('loading');
  const [rows,   setRows]   = useState<DailyChallengeRecord[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllDailyScores()
      .then(data => {
        if (!cancelled) { setRows(data); setState('done'); }
      })
      .catch(err => {
        if (!cancelled) {
          setErrMsg(err instanceof Error ? err.message : String(err));
          setState('error');
        }
      });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent background scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="dc-allscores-overlay" onClick={onClose}>
      <div
        className="dc-allscores-sheet"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dc-allscores-header">
          <span className="dc-allscores-title">Daily Challenge — All Scores</span>
          <button className="dc-allscores-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="dc-allscores-list">
          {state === 'loading' && (
            <div className="dc-allscores-loading">
              <div className="room-loading-spinner" />
            </div>
          )}

          {state === 'error' && (
            <p className="dc-allscores-empty">
              {errMsg?.startsWith('TABLE_MISSING')
                ? 'Table not set up yet.'
                : 'Could not load scores.'}
            </p>
          )}

          {state === 'done' && rows.length === 0 && (
            <p className="dc-allscores-empty">No scores yet today.</p>
          )}

          {state === 'done' && rows.length > 0 && rows.map((r, i) => {
            const isMe = r.player_name === myName;
            const is1st = i === 0;
            const is2nd = i === 1;
            return (
              <div
                key={r.id}
                className={[
                  'dc-allscores-row',
                  is1st ? 'dc-allscores-row--1st' : '',
                  is2nd ? 'dc-allscores-row--2nd' : '',
                  isMe  ? 'dc-allscores-row--me'  : '',
                ].filter(Boolean).join(' ')}
              >
                <span className="dc-allscores-rank">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : `#${i + 1}`}
                </span>
                <span className="dc-allscores-name">
                  {r.player_name}{isMe ? ' · you' : ''}
                </span>
                <span className="dc-allscores-score">{r.final_score}</span>
                <span className="dc-allscores-time">{fmtTime(r.completed_at)}</span>
              </div>
            );
          })}

          {state === 'done' && rows.length > 0 && (
            <p className="dc-allscores-count">
              {rows.length} attempt{rows.length !== 1 ? 's' : ''} today
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type SubmitStatus = 'submitting' | 'done' | 'error';

export default function DailyChallengeResultScreen({
  playerName, gameResults, totalScore, onPlayAgain, onExit,
}: Props) {
  const [submitStatus,  setSubmitStatus]  = useState<SubmitStatus>('submitting');
  const [submitError,   setSubmitError]   = useState<string | null>(null);
  const [submitDetail,  setSubmitDetail]  = useState<string | null>(null);
  const [leaderboard,   setLeaderboard]   = useState<DailyChallengeRecord[]>([]);
  const [lbLoading,     setLbLoading]     = useState(true);
  const [lbError,       setLbError]       = useState(false);
  const [lbErrorMsg,    setLbErrorMsg]    = useState<string | null>(null);
  const [showAllScores, setShowAllScores] = useState(false);

  const myName    = playerName.trim() || 'Anonymous';
  const dateLabel = formatLocalDate();
  const message   = getMessage(totalScore);

  // ── Submit + load compact leaderboard on mount ────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function run() {
      // 1. Submit score
      const gamesPlayed = gameResults.map(r => r.mode);
      try {
        await submitDailyChallengeScore(myName, totalScore, gameResults, gamesPlayed);
        if (!cancelled) setSubmitStatus('done');
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        if (!cancelled) {
          setSubmitStatus('error');
          if (raw.startsWith('TABLE_MISSING')) {
            setSubmitError('Daily leaderboard table not set up yet.');
            setSubmitDetail('Run the SQL migration in your Supabase SQL Editor to enable saving.');
          } else if (raw.startsWith('PERMISSION_DENIED')) {
            setSubmitError('Permission denied by database.');
            setSubmitDetail('Add an INSERT policy for the anon role on daily_challenge_scores.');
          } else {
            setSubmitError('Could not save score.');
            setSubmitDetail(import.meta.env.DEV ? raw : null);
          }
        }
      }

      // 2. Load compact leaderboard (best-per-player)
      try {
        const raw = await getDailyLeaderboard();
        if (!cancelled) {
          setLeaderboard(deduplicateLeaderboard(raw));
          setLbLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLbLoading(false);
          setLbError(true);
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.startsWith('TABLE_MISSING')) {
            setLbErrorMsg('Leaderboard not available — table not yet created.');
          } else {
            setLbErrorMsg(import.meta.env.DEV ? msg : 'Could not load leaderboard.');
          }
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Find current player rank in compact (deduped) leaderboard
  const myRankIndex = leaderboard.findIndex(r => r.player_name === myName);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="screen dc-result-screen">

      {/* Hero */}
      <div className="dc-result-hero">
        <p className="dc-result-date">{dateLabel}</p>
        <h1 className="dc-result-title">Daily Challenge<br/>Complete! 🏆</h1>
        <div className="dc-result-total-block">
          <span className="dc-result-total-num">{totalScore}</span>
          <span className="dc-result-total-denom">/ 500</span>
        </div>
        <p className="dc-result-message">{message}</p>
      </div>

      {/* Game-by-game breakdown */}
      <div className="dc-result-breakdown">
        <p className="dc-result-section-label">Game breakdown</p>
        {gameResults.map((r, i) => (
          <div key={i} className="dc-result-game-row">
            <span className="dc-result-game-num">{i + 1}</span>
            <span className="dc-result-game-name">
              {MODE_LABELS_FULL[r.mode] ?? r.mode}
            </span>
            <span className="dc-result-game-raw">{r.label}</span>
            <span className="dc-result-game-pts">{r.normalizedScore} pts</span>
          </div>
        ))}
        <div className="dc-result-total-row">
          <span>Daily Total</span>
          <span className="dc-result-total-pts">{totalScore} / 500</span>
        </div>
      </div>

      {/* Submit status */}
      <div className="dc-result-submit-status">
        {submitStatus === 'submitting' && (
          <p className="dc-submit-saving">Saving to leaderboard…</p>
        )}
        {submitStatus === 'done' && (
          <p className="dc-submit-done">✓ Saved!</p>
        )}
        {submitStatus === 'error' && (
          <>
            <p className="dc-submit-error">{submitError ?? 'Could not save score.'}</p>
            {submitDetail && (
              <p className="dc-submit-error-detail">{submitDetail}</p>
            )}
          </>
        )}
      </div>

      {/* Compact leaderboard — best per player */}
      <div className="dc-leaderboard">
        <p className="dc-result-section-label dc-lb-header">
          Today's Leaderboard
          {myRankIndex >= 0 && (
            <span className="dc-lb-my-rank"> · You're #{myRankIndex + 1}</span>
          )}
        </p>

        {lbLoading && (
          <div className="dc-lb-loading">
            <div className="room-loading-spinner" />
          </div>
        )}

        {!lbLoading && lbError && (
          <p className="dc-lb-empty">
            {lbErrorMsg ?? 'Leaderboard unavailable.'}
          </p>
        )}

        {!lbLoading && !lbError && leaderboard.length === 0 && (
          <p className="dc-lb-empty">No daily scores yet — be the first! 🌟</p>
        )}

        {!lbLoading && !lbError && leaderboard.length > 0 && (
          <div className="dc-lb-list">
            {leaderboard.slice(0, 10).map((r, i) => (
              <LBRow
                key={r.id}
                record={r}
                rank={i}
                isMe={r.player_name === myName}
              />
            ))}
          </div>
        )}

        {/* All Scores trigger — always shown once leaderboard has loaded */}
        {!lbLoading && (
          <button
            className="dc-allscores-trigger"
            onClick={() => setShowAllScores(true)}
          >
            Daily Challenge All Scores
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="dc-result-actions">
        <button className="btn-primary" onClick={onPlayAgain}>
          ▷ Play Again
        </button>
        <button className="btn-ghost" onClick={onExit}>
          ← Home
        </button>
      </div>

      {/* All Scores bottom sheet */}
      {showAllScores && (
        <AllScoresSheet
          myName={myName}
          onClose={() => setShowAllScores(false)}
        />
      )}

    </div>
  );
}
