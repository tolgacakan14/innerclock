import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoomContext, GameMode } from '../types';
import { getRoomScores, type ScoreRow } from '../lib/roomScores';
import { clearRoomPlayer } from '../lib/roomStorage';
import {
  getLobbyPlayers,
  getRoomWithStatus,
  getRoomRounds,
  hostStartGame,
  setRoomPlaying,
  resetRoom,
  startPartyGame,
  startRound,
  completeRound,
  finishPartyGame,
  MODE_LABELS,
  MODE_LABELS_FULL,
  MODE_ICONS,
  type LobbyPlayerRow,
  type RoomWithStatus,
  type RoundRow,
} from '../lib/roomRounds';

// ── Mode definitions ──────────────────────────────────────────────────────────

const ALL_MODES: { id: GameMode; icon: string; label: string; sub: string }[] = [
  { id: 'rush',        icon: '⚡', label: 'Rush',          sub: 'Tap reaction'    },
  { id: 'color',       icon: '🎨', label: 'Colour',        sub: 'Colour memory'   },
  { id: 'golf',        icon: '⛳', label: 'Golf',           sub: 'Precision shot'  },
  { id: 'grandma',     icon: '👵', label: 'Grandma',        sub: 'Survival run'    },
  { id: 'arrowEscape', icon: '🏹', label: 'Arrow Escape',   sub: 'Logic puzzle'    },
  { id: 'time',        icon: '⏱', label: 'Time',           sub: 'Internal clock'  },
  { id: 'sequence',    icon: '🔢', label: 'Sequence Tap',   sub: 'Pattern memory'  },
  { id: 'memory',      icon: '🧠', label: 'Memory Grid',    sub: 'Cell recall'     },
  { id: 'timing',      icon: '🎯', label: 'Tap Timing',     sub: 'Precision tap'   },
];

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  roomCtx:    RoomContext;
  onPlayMode: (mode: GameMode, roundId?: string, roundNumber?: number) => void;
  onLeave:    () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function RoomLobbyScreen({ roomCtx, onPlayMode, onLeave }: Props) {
  const navigate = useNavigate();

  // ── Core state ─────────────────────────────────────────────────────────────
  const [players,  setPlayers]  = useState<LobbyPlayerRow[]>([]);
  const [room,     setRoom]     = useState<RoomWithStatus | null>(null);
  const [rounds,   setRounds]   = useState<RoundRow[]>([]);
  const [scores,   setScores]   = useState<ScoreRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState('');

  // ── Host action state ──────────────────────────────────────────────────────
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [busy,         setBusy]         = useState(false);
  const [actionErr,    setActionErr]    = useState('');

  // ── Misc UI ────────────────────────────────────────────────────────────────
  const [copied,   setCopied]   = useState(false);
  const [cdVal,    setCdVal]    = useState<number | null>(null);  // 3,2,1,0 = GO
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Played round IDs this session
  const [playedRoundIds, setPlayedRoundIds] = useState<Set<string>>(new Set());

  // Prevent double-launch from countdown
  const hasLaunchedRef  = useRef(false);
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdTickRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPlayModeRef   = useRef(onPlayMode);
  const inviteUrl       = `${window.location.origin}/room/${roomCtx.roomCode}`;

  useEffect(() => { onPlayModeRef.current = onPlayMode; }, [onPlayMode]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [p, r, rds, sc] = await Promise.all([
        getLobbyPlayers(roomCtx.roomId),
        getRoomWithStatus(roomCtx.roomId),
        getRoomRounds(roomCtx.roomId),
        getRoomScores(roomCtx.roomId),
      ]);

      setPlayers(p);
      setRoom(r);
      setRounds(rds);
      setScores(sc.slice(0, 5));
      setLoadErr('');

      console.log('[RoomLobby] room state', {
        game_status:          r?.game_status,
        selected_mode:        r?.selected_mode,
        countdown_starts_at:  r?.countdown_starts_at,
        isHost:               r?.host_player_id === roomCtx.playerId,
      });
      console.log('[RoomLobby] players', p.map(x => x.player_name));
    } catch (e) {
      console.error('[RoomLobby] failed to load room state', e);
      setLoadErr('Could not load room. Retrying…');
    } finally {
      setLoading(false);
    }
  }, [roomCtx.roomId, roomCtx.playerId]);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchAll]);

  // ── Countdown ticker ───────────────────────────────────────────────────────
  useEffect(() => {
    if (cdTickRef.current) { clearInterval(cdTickRef.current); cdTickRef.current = null; }

    const gs  = room?.game_status;
    const cat = room?.countdown_starts_at;
    const sm  = room?.selected_mode;

    if (gs !== 'countdown' || !cat) {
      setCdVal(null);
      // If game transitioned FROM countdown to playing, reset hasLaunched
      // so future countdowns work for the same player session
      if (gs === 'playing') hasLaunchedRef.current = false;
      return;
    }

    const startTs = new Date(cat).getTime();

    const tick = () => {
      const remaining = 3 - Math.floor((Date.now() - startTs) / 1000);
      const clamped   = Math.max(remaining, 0);
      setCdVal(clamped);

      if (remaining <= 0 && !hasLaunchedRef.current && sm) {
        hasLaunchedRef.current = true;
        if (cdTickRef.current) { clearInterval(cdTickRef.current); cdTickRef.current = null; }

        // Host flips game_status to 'playing' so late joiners don't auto-launch
        if (room?.host_player_id === roomCtx.playerId) {
          setRoomPlaying(roomCtx.roomId).catch(err =>
            console.error('[RoomLobby] failed to set playing state', err),
          );
        }

        // Short pause to show "GO!" then launch game
        setTimeout(() => {
          onPlayModeRef.current(sm as GameMode);
        }, 700);
      }
    };

    tick();
    cdTickRef.current = setInterval(tick, 200);

    return () => {
      if (cdTickRef.current) { clearInterval(cdTickRef.current); cdTickRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.game_status, room?.countdown_starts_at, room?.selected_mode]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isHost        = Boolean(room?.host_player_id && room.host_player_id === roomCtx.playerId);
  const gs            = room?.game_status ?? 'waiting';
  const activeRound   = rounds.find(r => r.status === 'active');
  const allRoundsDone = rounds.length === 5 && rounds.every(r => r.status === 'completed');

  function canStartRound(roundNum: number): boolean {
    if (activeRound) return false;
    if (roundNum === 1) return true;
    return rounds.find(r => r.round_number === roundNum - 1)?.status === 'completed';
  }

  // ── Host action handlers ───────────────────────────────────────────────────

  function handleCopyLink() {
    navigator.clipboard.writeText(inviteUrl).catch(() => {
      const el = document.createElement('textarea');
      el.value = inviteUrl;
      el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el); el.select(); document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleStartGame() {
    if (!selectedMode) return;
    setBusy(true); setActionErr('');
    try {
      await hostStartGame(roomCtx.roomId, selectedMode);
      hasLaunchedRef.current = false;   // reset so this session can launch
      await fetchAll();
    } catch (e) {
      console.error('[RoomLobby] failed to update room state', e);
      setActionErr('Could not start game. Try again.');
    } finally { setBusy(false); }
  }

  async function handleReset() {
    setBusy(true); setActionErr('');
    try {
      await resetRoom(roomCtx.roomId);
      hasLaunchedRef.current = false;
      setSelectedMode(null);
      await fetchAll();
    } catch (e) {
      console.error('[RoomLobby] failed to update room state', e);
      setActionErr('Could not reset room.');
    } finally { setBusy(false); }
  }

  // 5-round party handlers
  async function handleStartPartyGame() {
    setBusy(true); setActionErr('');
    try {
      const newRounds = await startPartyGame(roomCtx.roomId);
      setRounds(newRounds);
      await fetchAll();
    } catch (e) {
      console.error('[RoomLobby] failed to update room state', e);
      setActionErr('Could not start party game.');
    } finally { setBusy(false); }
  }

  async function handleStartRound(r: RoundRow) {
    setBusy(true); setActionErr('');
    try { await startRound(r.id); await fetchAll(); }
    catch (e) {
      console.error('[RoomLobby] failed to update room state', e);
      setActionErr('Could not start round.');
    } finally { setBusy(false); }
  }

  async function handleCompleteRound(r: RoundRow) {
    setBusy(true); setActionErr('');
    try { await completeRound(r.id); await fetchAll(); }
    catch (e) {
      console.error('[RoomLobby] failed to update room state', e);
      setActionErr('Could not complete round.');
    } finally { setBusy(false); }
  }

  async function handleFinishGame() {
    setBusy(true); setActionErr('');
    try { await finishPartyGame(roomCtx.roomId); navigate(`/room/${roomCtx.roomCode}/final`); }
    catch (e) {
      console.error('[RoomLobby] failed to update room state', e);
      setActionErr('Could not finish game.');
    } finally { setBusy(false); }
  }

  function handlePlayRound(r: RoundRow) {
    setPlayedRoundIds(prev => new Set(prev).add(r.id));
    onPlayMode(r.mode as GameMode, r.id, r.round_number);
  }

  function handleLeave() {
    clearRoomPlayer(roomCtx.roomCode);
    onLeave();
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  /** Big animated countdown overlay — covers the whole screen */
  function renderCountdown() {
    const modeLabel = room?.selected_mode
      ? `${MODE_ICONS[room.selected_mode] ?? '🎮'} ${MODE_LABELS_FULL[room.selected_mode] ?? room.selected_mode}`
      : '';

    return (
      <div className="lobby-cd-overlay">
        <p className="lobby-cd-mode">{modeLabel}</p>
        <div className="lobby-cd-num" key={cdVal}>
          {cdVal === 0 ? 'GO!' : cdVal}
        </div>
        <p className="lobby-cd-hint">Get ready…</p>
      </div>
    );
  }

  /** Host mode-selection cards */
  function renderModeSelector() {
    return (
      <div className="lobby-mode-select-grid">
        {ALL_MODES.map(m => (
          <button
            key={m.id}
            className={`lobby-mode-card${selectedMode === m.id ? ' lobby-mode-card--selected' : ''}`}
            onClick={() => setSelectedMode(m.id)}
            disabled={busy}
          >
            <span className="lobby-mode-card-icon">{m.icon}</span>
            <span className="lobby-mode-card-label">{m.label}</span>
            <span className="lobby-mode-card-sub">{m.sub}</span>
          </button>
        ))}
      </div>
    );
  }

  /** Player list */
  function renderPlayers() {
    return (
      <div className="room-players-section">
        <div className="room-section-row">
          <span className="room-section-title">
            👥 Players
            {players.length > 0 && <span className="room-count-chip">{players.length}</span>}
          </span>
          <button className="room-refresh-btn" onClick={fetchAll} disabled={busy} aria-label="Refresh">↻</button>
        </div>
        {loading ? (
          <p className="room-preview-empty">Loading…</p>
        ) : players.length === 0 ? (
          <p className="room-preview-empty">No players yet.</p>
        ) : (
          <div className="room-players-list">
            {players.map(p => (
              <div key={p.id} className="room-player-row">
                <span className="room-player-name">{p.player_name}</span>
                <div className="room-player-badges">
                  {p.id === room?.host_player_id && <span className="room-badge room-badge--host">Host</span>}
                  {p.id === roomCtx.playerId       && <span className="room-badge room-badge--you">You</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="screen room-lobby-screen" style={{ position: 'relative' }}>

      {/* ── Countdown overlay ─────────────────────────────────────────────── */}
      {gs === 'countdown' && cdVal !== null && renderCountdown()}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="room-lobby-header">
        <div className="room-lobby-meta">
          <h2 className="room-lobby-name">{roomCtx.roomName}</h2>
          <div className="room-lobby-code-row">
            <span className="room-lobby-code">{roomCtx.roomCode}</span>
            <button
              className={`room-copy-btn${copied ? ' room-copy-btn--done' : ''}`}
              onClick={handleCopyLink}
              aria-label="Copy invite link"
            >
              {copied ? '✓ Copied' : '⎘ Invite'}
            </button>
          </div>
          <p className="room-lobby-player">
            Playing as <strong>{roomCtx.playerName}</strong>
            {isHost && <span className="room-badge room-badge--host" style={{ marginLeft: 8 }}>Host</span>}
          </p>
        </div>
      </div>

      {loadErr && <p className="room-form-error">{loadErr}</p>}

      {/* ── Players ───────────────────────────────────────────────────────── */}
      {renderPlayers()}

      {/* ── Party Game — synchronized single-round (PRIMARY) ─────────────── */}
      {(gs === 'waiting' || gs === 'mode_selected') && (
        <div className="room-party-section">
          <span className="room-section-title">🎮 Party Game</span>

          {isHost ? (
            <>
              <div className="lobby-host-label">
                <span className="lobby-host-crown">👑</span> You are the host
              </div>
              <p className="room-party-hint">Select a mode, then tap <strong>Start Game</strong> for a synced countdown.</p>
              {renderModeSelector()}
              <button
                className="btn-primary room-party-start-btn"
                onClick={handleStartGame}
                disabled={!selectedMode || busy}
              >
                {busy
                  ? 'Starting…'
                  : selectedMode
                    ? `Start ${MODE_ICONS[selectedMode]} ${MODE_LABELS[selectedMode]}`
                    : 'Select a mode first'}
              </button>
            </>
          ) : (
            <div className="lobby-waiting-panel">
              <div className="lobby-waiting-spinner" />
              <p className="lobby-waiting-text">Waiting for host to choose a game…</p>
            </div>
          )}

          {actionErr && <p className="room-form-error" style={{ marginTop: 8 }}>{actionErr}</p>}
        </div>
      )}

      {/* ── Game in progress — players returned to lobby while mode='playing' */}
      {gs === 'playing' && (
        <div className="room-party-section">
          <span className="room-section-title">🎮 Game in progress</span>
          <div className="lobby-playing-panel">
            <p className="lobby-playing-text">
              {MODE_ICONS[room?.selected_mode ?? ''] ?? '🎮'}{' '}
              {MODE_LABELS_FULL[room?.selected_mode ?? ''] ?? 'Game'} is live!
            </p>
            <button
              className="btn-primary room-party-start-btn"
              onClick={() => {
                if (room?.selected_mode) onPlayMode(room.selected_mode as GameMode);
              }}
            >
              Join Game →
            </button>
          </div>
          {isHost && (
            <button className="lobby-reset-btn" onClick={handleReset} disabled={busy}>
              ↺ Reset Room
            </button>
          )}
        </div>
      )}

      {/* ── 5-Round Advanced Party — legacy (SECONDARY) ──────────────────── */}
      {(gs === 'waiting' || gs === 'mode_selected') && isHost && (
        <div className="room-advanced-section">
          <button
            className="lobby-advanced-toggle"
            onClick={() => setShowAdvanced(v => !v)}
          >
            🔄 Multi-Round Party {showAdvanced ? '▲' : '▼'}
          </button>
          {showAdvanced && (
            <div className="room-party-section" style={{ marginTop: 10 }}>
              <p className="room-party-hint">
                Run a guided 5-round game.
                <br />
                <span className="room-party-hint-seq">⚡ Rush → 🎨 Colour → ⛳ Golf → 👵 Grandma → 🏹 Arrow</span>
              </p>
              <button
                className="btn-primary room-party-start-btn"
                onClick={handleStartPartyGame}
                disabled={busy}
              >
                {busy ? 'Starting…' : '🎮 Start 5-Round Party'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5-round active state (legacy) */}
      {gs === 'active' && (
        <div className="room-party-section">
          <span className="room-section-title">🎮 Party Game — Round Progress</span>

          {activeRound && (
            <div className="room-active-banner">
              <div className="room-active-banner-label">
                <span className="room-active-banner-round">Round {activeRound.round_number}</span>
                <span className="room-active-banner-mode">
                  {MODE_ICONS[activeRound.mode]} {MODE_LABELS[activeRound.mode]}
                </span>
              </div>
              {playedRoundIds.has(activeRound.id) ? (
                <span className="room-played-badge">✓ Submitted</span>
              ) : (
                <button className="btn-primary room-play-now-btn" onClick={() => handlePlayRound(activeRound)}>
                  Play Now →
                </button>
              )}
            </div>
          )}

          <div className="room-rounds-list">
            {rounds.map(r => (
              <div key={r.id} className={`room-round-row room-round-row--${r.status}`}>
                <span className="room-round-num">R{r.round_number}</span>
                <span className="room-round-icon">{MODE_ICONS[r.mode]}</span>
                <span className="room-round-name">{MODE_LABELS[r.mode]}</span>
                <span className="room-round-status-icon">
                  {r.status === 'completed' ? '✓' : r.status === 'active' ? '🔵' : '○'}
                </span>
                {isHost && r.status === 'waiting' && canStartRound(r.round_number) && (
                  <button className="room-round-action-btn" onClick={() => handleStartRound(r)} disabled={busy}>Start</button>
                )}
                {isHost && r.status === 'active' && (
                  <button className="room-round-action-btn room-round-action-btn--done" onClick={() => handleCompleteRound(r)} disabled={busy}>Done</button>
                )}
              </div>
            ))}
          </div>

          {isHost && allRoundsDone && (
            <button className="btn-primary room-party-start-btn" onClick={handleFinishGame} disabled={busy}>
              {busy ? 'Finishing…' : '🏆 End Game & See Results'}
            </button>
          )}

          {isHost && (
            <button className="lobby-reset-btn" onClick={handleReset} disabled={busy}>
              ↺ Reset Room
            </button>
          )}

          {actionErr && <p className="room-form-error">{actionErr}</p>}
        </div>
      )}

      {/* Game completed */}
      {gs === 'completed' && (
        <div className="room-party-complete">
          <p className="room-party-complete-label">🎉 Party game complete!</p>
          <button
            className="btn-primary room-party-start-btn"
            onClick={() => navigate(`/room/${roomCtx.roomCode}/final`)}
          >
            🏆 View Final Results
          </button>
          {isHost && (
            <button className="lobby-reset-btn" onClick={handleReset} disabled={busy}>
              ↺ Play Again
            </button>
          )}
        </div>
      )}

      {/* ── Recent scores ─────────────────────────────────────────────────── */}
      <div className="room-lobby-scores-preview">
        <div className="room-lobby-scores-header">
          <p className="room-lobby-section-title" style={{ margin: 0 }}>Recent scores</p>
          <button
            className="btn-ghost room-lobby-full-board-btn"
            onClick={() => navigate(`/room/${roomCtx.roomCode}/scoreboard`)}
          >
            Full scoreboard →
          </button>
        </div>
        {loading && <p className="room-preview-empty">Loading…</p>}
        {!loading && scores.length === 0 && (
          <p className="room-preview-empty">No scores yet — be the first!</p>
        )}
        {!loading && scores.length > 0 && (
          <div className="room-preview-list">
            {scores.map(s => (
              <div key={s.id} className="room-preview-row">
                <span className="room-preview-player">{s.player_name}</span>
                <span className="room-preview-mode">{s.mode}</span>
                <span className="room-preview-score">{s.score_label}</span>
                <span className="room-preview-time">{fmtTime(s.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Free Play ─────────────────────────────────────────────────────── */}
      <details className="lobby-freeplay-details">
        <summary className="lobby-freeplay-summary">Free Play</summary>
        <div className="room-lobby-modes" style={{ marginTop: 12 }}>
          {ALL_MODES.map(m => (
            <button
              key={m.id}
              className="room-lobby-mode-card"
              onClick={() => onPlayMode(m.id)}
            >
              <span className="room-mode-icon">{m.icon}</span>
              <span className="room-mode-label">{m.label}</span>
              <span className="room-mode-sub">{m.sub}</span>
            </button>
          ))}
        </div>
      </details>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="room-lobby-footer">
        <button className="btn-ghost" onClick={handleLeave}>Leave Room</button>
      </div>

    </div>
  );
}
