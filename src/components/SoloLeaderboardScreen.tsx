import { useEffect, useRef, useState } from 'react';
import {
  getSoloLeaderboard,
  SOLO_MODE_LIST,
  SOLO_MODE_LABELS,
  SOLO_LOWER_IS_BETTER,
  type SoloScoreRow,
} from '../lib/soloScores';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
}

// ── Leaderboard row ───────────────────────────────────────────────────────────

function LBRow({ row, rank }: { row: SoloScoreRow; rank: number }) {
  return (
    <div className={[
      'solo-lb-row',
      rank === 0 ? 'solo-lb-row--1st' : '',
      rank === 1 ? 'solo-lb-row--2nd' : '',
      rank === 2 ? 'solo-lb-row--3rd' : '',
    ].filter(Boolean).join(' ')}>
      <span className={[
        'solo-lb-rank',
        rank === 0 ? 'solo-lb-rank--1st' : '',
        rank === 1 ? 'solo-lb-rank--2nd' : '',
      ].filter(Boolean).join(' ')}>
        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
      </span>
      <span className="solo-lb-player">{row.player_name}</span>
      <span className="solo-lb-score">{row.score_label ?? String(row.score_value)}</span>
      <span className="solo-lb-date">{fmtDate(row.completed_at)}</span>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type FetchState = 'loading' | 'done' | 'error';

export default function SoloLeaderboardScreen({ onBack }: Props) {
  const [activeMode, setActiveMode] = useState<string>(SOLO_MODE_LIST[0]);
  const [rows,       setRows]       = useState<SoloScoreRow[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [errMsg,     setErrMsg]     = useState<string | null>(null);

  // Client-side cache — avoids re-fetching already-loaded tabs
  const [cache] = useState<Map<string, SoloScoreRow[]>>(() => new Map());

  // Refs for scrolling the active tab into view
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const activeTabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Fetch leaderboard whenever active mode changes
  useEffect(() => {
    const hit = cache.get(activeMode);
    if (hit) {
      setRows(hit);
      setFetchState('done');
    } else {
      let cancelled = false;
      setFetchState('loading');
      setErrMsg(null);

      getSoloLeaderboard(activeMode)
        .then(data => {
          if (cancelled) return;
          cache.set(activeMode, data);
          setRows(data);
          setFetchState('done');
        })
        .catch(err => {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          setErrMsg(
            msg.startsWith('TABLE_MISSING')
              ? 'Leaderboard table not set up yet. Run the SQL migration.'
              : 'Could not load scores.',
          );
          setFetchState('error');
        });

      return () => { cancelled = true; };
    }
  }, [activeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll the active tab button into view whenever it changes
  useEffect(() => {
    const btn = activeTabRefs.current.get(activeMode);
    if (btn && tabsScrollRef.current) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeMode]);

  const isLower = SOLO_LOWER_IS_BETTER.has(activeMode);

  return (
    <div className="solo-lb-screen">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="solo-lb-header">
        <button className="btn-ghost solo-lb-back" onClick={onBack}>← Back</button>
        <div className="solo-lb-title-block">
          <h1 className="solo-lb-title">Solo All-Time</h1>
          <p className="solo-lb-subtitle">Top submitted solo scores</p>
        </div>
      </div>

      {/* ── Mode tabs — horizontally scrollable ─────────────────── */}
      <div className="solo-lb-tabs-wrap" ref={tabsScrollRef}>
        <div className="solo-lb-tabs" role="tablist">
          {SOLO_MODE_LIST.map(mode => (
            <button
              key={mode}
              role="tab"
              aria-selected={activeMode === mode}
              ref={el => {
                if (el) activeTabRefs.current.set(mode, el);
                else activeTabRefs.current.delete(mode);
              }}
              className={[
                'solo-lb-tab',
                activeMode === mode ? 'solo-lb-tab--active' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setActiveMode(mode)}
            >
              {SOLO_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sort hint ───────────────────────────────────────────── */}
      <p className="solo-lb-sort-hint">
        {isLower ? '↓ Lower score is better' : '↑ Higher score is better'}
      </p>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="solo-lb-content">
        {fetchState === 'loading' && (
          <div className="solo-lb-loading">
            <div className="room-loading-spinner" />
          </div>
        )}

        {fetchState === 'error' && (
          <p className="solo-lb-empty">{errMsg ?? 'Could not load scores.'}</p>
        )}

        {fetchState === 'done' && rows.length === 0 && (
          <p className="solo-lb-empty">
            No solo scores yet — submit the first run!
          </p>
        )}

        {fetchState === 'done' && rows.length > 0 && (
          <div className="solo-lb-list">
            {rows.map((r, i) => (
              <LBRow key={r.id} row={r} rank={i} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
