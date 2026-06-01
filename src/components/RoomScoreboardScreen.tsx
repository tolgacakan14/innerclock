import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoomByCode, getRoomScores, type ScoreRow, type RoomRow } from '../lib/roomScores';
import { loadRoomPlayer } from '../lib/roomStorage';

type ModeFilter =
  | 'All'
  | 'Time Mode'
  | 'Colour Mode'
  | 'Rush Mode'
  | 'Golf Mode'
  | 'Grandma Walking'
  | 'Arrow Escape'
  | 'Sequence Tap'
  | 'Memory Grid'
  | 'Tap Timing';

const FILTERS: ModeFilter[] = [
  'All', 'Time Mode', 'Colour Mode', 'Rush Mode', 'Golf Mode',
  'Grandma Walking', 'Arrow Escape', 'Sequence Tap', 'Memory Grid', 'Tap Timing',
];

const FILTER_SHORT: Record<ModeFilter, string> = {
  'All':             'All',
  'Time Mode':       'Time',
  'Colour Mode':     'Colour',
  'Rush Mode':       'Rush',
  'Golf Mode':       'Golf',
  'Grandma Walking': 'Grandma',
  'Arrow Escape':    'Arrow',
  'Sequence Tap':    'Sequence',
  'Memory Grid':     'Memory',
  'Tap Timing':      'Timing',
};

// Sort scores: lower_is_better asc, higher_is_better desc
function sortedScores(scores: ScoreRow[]): ScoreRow[] {
  return [...scores].sort((a, b) => {
    if (a.score_type !== b.score_type) return 0;
    if (a.score_type === 'lower_is_better') return a.score_value - b.score_value;
    return b.score_value - a.score_value;
  });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Rank badge helper
function rankLabel(i: number) {
  if (i === 0) return '1st';
  if (i === 1) return '2nd';
  if (i === 2) return '3rd';
  return `#${i + 1}`;
}

interface SectionProps { mode: ModeFilter; scores: ScoreRow[] }
function ScoreSection({ mode, scores }: SectionProps) {
  const filtered = mode === 'All' ? scores : scores.filter(s => s.mode === mode);
  const sorted   = sortedScores(filtered);

  if (sorted.length === 0) {
    return (
      <div className="sb-section">
        <h3 className="sb-section-title">{mode}</h3>
        <p className="sb-empty">No scores yet</p>
      </div>
    );
  }

  return (
    <div className="sb-section">
      {mode !== 'All' && <h3 className="sb-section-title">{mode}</h3>}
      <div className="sb-list">
        {sorted.map((s, i) => (
          <div key={s.id} className={`sb-row${i < 3 ? ' sb-row--podium' : ''}`}>
            <span className="sb-rank">{rankLabel(i)}</span>
            <span className="sb-player">{s.player_name}</span>
            {mode === 'All' && <span className="sb-mode-tag">{s.mode}</span>}
            <span className="sb-score">{s.score_label}</span>
            <span className="sb-date">{fmtDateTime(s.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RoomScoreboardScreen() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate     = useNavigate();
  const code         = (roomCode ?? '').toUpperCase();

  const [room,       setRoom]       = useState<RoomRow | null>(null);
  const [scores,     setScores]     = useState<ScoreRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<ModeFilter>('All');
  const [copied,     setCopied]     = useState(false);
  const [notFound,   setNotFound]   = useState(false);

  const inviteUrl = `${window.location.origin}/room/${code}`;
  const savedCtx  = loadRoomPlayer(code);

  async function load() {
    setLoading(true);
    try {
      const r = await getRoomByCode(code);
      if (!r) { setNotFound(true); setLoading(false); return; }
      setRoom(r);
      const s = await getRoomScores(r.id);
      setScores(s);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [code]);  // eslint-disable-line react-hooks/exhaustive-deps

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl).catch(() => {
      const el = document.createElement('textarea');
      el.value = inviteUrl; el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el); el.select(); document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (notFound) {
    return (
      <div className="screen room-notfound-screen">
        <span className="room-notfound-icon">🔍</span>
        <h2 className="room-notfound-title">Room not found</h2>
        <button className="btn-primary" onClick={() => navigate('/')}>← Home</button>
      </div>
    );
  }

  // Filtered view
  const viewScores = filter === 'All'
    ? scores
    : scores.filter(s => s.mode === filter);

  return (
    <div className="screen sb-screen">
      {/* Header */}
      <div className="sb-header">
        <button className="btn-ghost sb-back-btn" onClick={() => navigate(`/room/${code}`)}>
          ← Room
        </button>
        <div className="sb-header-meta">
          <h2 className="sb-room-name">{room?.room_name ?? code}</h2>
          <div className="sb-code-row">
            <span className="sb-code">{code}</span>
            <button
              className={`room-copy-btn${copied ? ' room-copy-btn--done' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✓ Copied' : '⎘ Invite'}
            </button>
          </div>
        </div>
        <button className="btn-ghost sb-refresh-btn" onClick={load} aria-label="Refresh">
          ↺
        </button>
      </div>

      {/* Mode tabs — horizontally scrollable on mobile */}
      <div className="sb-tabs-wrap">
        <div className="sb-tabs" role="tablist">
          {FILTERS.map(f => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={`sb-tab${filter === f ? ' sb-tab--active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {FILTER_SHORT[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="sb-loading">
          <div className="room-loading-spinner" />
          <p>Loading scores…</p>
        </div>
      )}

      {!loading && (
        <div className="sb-content">
          {filter === 'All' ? (
            // Show each mode as separate section
            FILTERS.filter(f => f !== 'All').map(mode => {
              const modeScores = scores.filter(s => s.mode === mode);
              if (modeScores.length === 0) return null;
              return <ScoreSection key={mode} mode={mode} scores={modeScores} />;
            })
          ) : (
            <ScoreSection mode={filter} scores={viewScores} />
          )}

          {filter === 'All' && scores.length === 0 && (
            <p className="sb-empty sb-empty--center">
              No scores yet. Play a game and submit your result!
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      {savedCtx && (
        <div className="sb-footer">
          <button className="btn-secondary" onClick={() => navigate(`/room/${code}`)}>
            Back to Room
          </button>
        </div>
      )}
    </div>
  );
}
