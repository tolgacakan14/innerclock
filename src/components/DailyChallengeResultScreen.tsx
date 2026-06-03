import { useEffect, useState } from 'react';
import {
  submitDailyChallengeScore,
  getDailyLeaderboard,
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

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Leaderboard row ───────────────────────────────────────────────────────────

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

  const myName    = playerName.trim() || 'Anonymous';
  const dateLabel = formatLocalDate();
  const message   = getMessage(totalScore);

  // ── Submit + load leaderboard on mount ────────────────────────────────────
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
          // Humanise known sentinel errors
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

      // 2. Load leaderboard (even if submit failed — show empty state not error)
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

  // Find current player rank in leaderboard
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

      {/* Leaderboard */}
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
            {leaderboard.slice(0, 20).map((r, i) => (
              <LBRow
                key={r.id}
                record={r}
                rank={i}
                isMe={r.player_name === myName}
              />
            ))}
          </div>
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

    </div>
  );
}
