import { useRef, useState } from 'react';
import { submitSoloScore } from '../lib/soloScores';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  mode:       string;
  scoreValue: number;
  scoreLabel: string;
  scoreType:  'higher_is_better' | 'lower_is_better';
  playerName: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Status = 'idle' | 'saving' | 'done' | 'error';

export default function SoloScoreSubmit({ mode, scoreValue, scoreLabel, scoreType, playerName }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Ref guards — survive React StrictMode's double-invoke
  const submittedRef      = useRef(false);
  const saveInProgressRef = useRef(false);

  async function handleSubmit() {
    if (submittedRef.current || saveInProgressRef.current) return;
    saveInProgressRef.current = true;
    setStatus('saving');

    const safeName = (playerName || 'anon').replace(/\s+/g, '_').slice(0, 30);
    const runId    = `solo-${mode}-${safeName}-${scoreValue}-${Date.now()}`;

    try {
      await submitSoloScore({
        playerName: playerName || 'Anonymous',
        mode,
        scoreValue,
        scoreLabel,
        scoreType,
        runId,
      });
      submittedRef.current = true;
      setStatus('done');
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.startsWith('DUPLICATE')) {
        // Already saved — treat as success
        submittedRef.current = true;
        setStatus('done');
      } else if (raw.startsWith('TABLE_MISSING')) {
        setErrMsg('Leaderboard table not set up yet.');
        setStatus('error');
      } else if (raw.startsWith('PERMISSION_DENIED')) {
        setErrMsg('Permission denied.');
        setStatus('error');
      } else {
        setErrMsg(import.meta.env.DEV ? raw : 'Could not submit score.');
        setStatus('error');
      }
    } finally {
      saveInProgressRef.current = false;
    }
  }

  if (status === 'done') {
    return (
      <div className="solo-submit-wrap">
        <div className="solo-submit-done">✓ Submitted to Solo All-Time</div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="solo-submit-wrap">
        <div className="solo-submit-error">{errMsg ?? 'Could not submit score.'}</div>
      </div>
    );
  }

  return (
    <div className="solo-submit-wrap">
      <button
        className={`solo-submit-btn${status === 'saving' ? ' solo-submit-btn--saving' : ''}`}
        onClick={handleSubmit}
        disabled={status === 'saving'}
      >
        {status === 'saving' ? 'Saving…' : 'Submit to Leaderboard'}
      </button>
    </div>
  );
}
