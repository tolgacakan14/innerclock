import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RoomContext, GameMode } from '../types';
import { getRoomScores, type ScoreRow } from '../lib/roomScores';
import { clearRoomPlayer } from '../lib/roomStorage';
import {
  getLobbyPlayers,
  getRoomWithStatus,
  getRoomRounds,
  hostSelectMode,
  hostStartGame,
  hostStartChallenge,
  setRoomPlaying,
  resetRoom,
  repairHostPlayerId,
  startPartyGame,
  startRound,
  completeRound,
  finishPartyGame,
  MODE_LABELS,
  MODE_LABELS_FULL,
  MODE_SCORE_LABEL,
  MODE_ICONS,
  LOWER_IS_BETTER,
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

function rankBadge(i: number) {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return `#${i + 1}`;
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
  const [players,   setPlayers]   = useState<LobbyPlayerRow[]>([]);
  const [room,      setRoom]      = useState<RoomWithStatus | null>(null);
  const [rounds,    setRounds]    = useState<RoundRow[]>([]);
  const [allScores, setAllScores] = useState<ScoreRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadErr,   setLoadErr]   = useState('');

  // ── Host action state ──────────────────────────────────────────────────────
  const [busy,      setBusy]      = useState(false);
  const [actionErr, setActionErr] = useState('');

  // ── Misc UI ────────────────────────────────────────────────────────────────
  const [copied,      setCopied]      = useState(false);
  const [cdVal,       setCdVal]       = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Played round IDs this session
  const [playedRoundIds, setPlayedRoundIds] = useState<Set<string>>(new Set());

  const hasLaunchedRef  = useRef(false);
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdTickRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPlayModeRef   = useRef(onPlayMode);
  const selfHealRef     = useRef(false);
  const inviteUrl       = `${window.location.origin}/room/${roomCtx.roomCode}`;

  useEffect(() => { onPlayModeRef.current = onPlayMode; }, [onPlayMode]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const [pResult, rResult, rdsResult, scResult] = await Promise.allSettled([
      getLobbyPlayers(roomCtx.roomId),
      getRoomWithStatus(roomCtx.roomId),
      getRoomRounds(roomCtx.roomId),
      getRoomScores(roomCtx.roomId),
    ]);

    // Players
    if (pResult.status === 'fulfilled') {
      setPlayers(pResult.value);
    } else {
      console.error('[RoomHub] players fetch error', pResult.reason);
    }

    // Room status
    if (rResult.status === 'fulfilled') {
      setRoom(rResult.value);
      setLoadErr('');
    } else {
      console.error('[RoomHub] room fetch error', rResult.reason);
      // Only show error if players also failed — room is critical
      if (pResult.status === 'rejected') {
        setLoadErr('Could not load room. Retrying…');
      }
    }

    // Debug identity info
    const fetchedRoom = rResult.status === 'fulfilled' ? rResult.value : null;
    const fetchedPlayers = pResult.status === 'fulfilled' ? pResult.value : [];
    const currentPlayer = fetchedPlayers.find(p => p.id === roomCtx.playerId) ?? null;
    console.log('[RoomHub] room', fetchedRoom);
    console.log('[RoomHub] players', fetchedPlayers.map(p => p.player_name));
    console.log('[RoomHub] currentPlayer', currentPlayer);
    console.log('[RoomHub] currentPlayerId', roomCtx.playerId);
    console.log('[RoomHub] hostPlayerId (DB)', fetchedRoom?.host_player_id ?? null);
    console.log('[RoomHub] isHost (DB match)', fetchedRoom?.host_player_id === roomCtx.playerId);
    console.log('[RoomHub] local identity', { playerId: roomCtx.playerId, isHost: roomCtx.isHost });

    // Room rounds (non-critical)
    if (rdsResult.status === 'fulfilled') {
      setRounds(rdsResult.value);
    } else {
      console.error('[RoomHub] room_rounds fetch error', rdsResult.reason);
      setRounds([]);
    }

    // Scores (non-critical)
    if (scResult.status === 'fulfilled') {
      setAllScores(scResult.value);
    } else {
      console.error('[RoomHub] scores fetch error', scResult.reason);
    }

    setLoading(false);
  }, [roomCtx.roomId, roomCtx.playerId, roomCtx.isHost]); // eslint-disable-line react-hooks/exhaustive-deps

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

        // Use both DB and localStorage fallback to decide who calls setRoomPlaying
        const amHost = (room?.host_player_id === roomCtx.playerId) || (roomCtx.isHost === true && !room?.host_player_id);
        if (amHost) {
          setRoomPlaying(roomCtx.roomId).catch(err =>
            console.error('[RoomLobby] failed to set playing state', err),
          );
        }

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

  // ── Host identity: multi-layer detection ─────────────────────────────────
  // Primary: DB is authoritative source of truth
  const isHostByDB    = Boolean(room?.host_player_id && room.host_player_id === roomCtx.playerId);
  // Fallback: localStorage flag, ONLY when DB has no host recorded yet
  const isHostByLocal = roomCtx.isHost === true && !room?.host_player_id;
  const isHost        = isHostByDB || isHostByLocal;
  // Canonical host player ID for badge display (covers both DB and fallback)
  const hostPlayerId  = room?.host_player_id ?? (isHostByLocal ? roomCtx.playerId : null);

  // ── Self-heal: write host_player_id to DB if localStorage says isHost ───
  useEffect(() => {
    // Only run once, only when DB has no host and localStorage says we are host
    if (!isHostByLocal || selfHealRef.current || room === null) return;
    selfHealRef.current = true;
    repairHostPlayerId(roomCtx.roomId, roomCtx.playerId)
      .then(() => {
        console.log('[RoomLobby] self-heal: host_player_id repaired in DB');
        fetchAll();
      })
      .catch(err => {
        console.warn('[RoomLobby] self-heal failed (column may not exist yet):', err.message);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHostByLocal, room]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const gs          = room?.game_status ?? 'waiting';
  const selectedMode = room?.selected_mode ?? null;
  const activeRound = rounds.find(r => r.status === 'active');
  const allRoundsDone = rounds.length === 5 && rounds.every(r => r.status === 'completed');

  // Recent scores (last 5 overall)
  const recentScores = allScores.slice(0, 5);

  // Challenge leaderboard: best score per player for the active selected_mode
  const challengeLeaderboard = useMemo(() => {
    if (!selectedMode) return [];

    // Match scores by mode label (scores table stores full mode name)
    const modeLabel = MODE_SCORE_LABEL[selectedMode] ?? MODE_LABELS_FULL[selectedMode] ?? '';
    const modeScores = allScores.filter(s =>
      s.mode === modeLabel ||
      s.mode === MODE_LABELS[selectedMode] ||
      s.mode === selectedMode,
    );

    if (modeScores.length === 0) return [];

    // Keep best score per player
    const byPlayer = new Map<string, ScoreRow>();
    for (const s of modeScores) {
      const existing = byPlayer.get(s.player_id);
      if (!existing) {
        byPlayer.set(s.player_id, s);
      } else {
        const isHigher = s.score_type === 'higher_is_better';
        const isBetter = isHigher
          ? s.score_value > existing.score_value
          : s.score_value < existing.score_value;
        if (isBetter) byPlayer.set(s.player_id, s);
      }
    }

    const arr = Array.from(byPlayer.values());
    const isHigher = !LOWER_IS_BETTER.has(selectedMode);
    return arr.sort((a, b) =>
      isHigher ? b.score_value - a.score_value : a.score_value - b.score_value,
    );
  }, [allScores, selectedMode]);

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

  /** Host taps a mode card → persists selection to Supabase immediately */
  async function handleSelectMode(mode: GameMode) {
    if (!isHost) return;
    setBusy(true); setActionErr('');
    try {
      await hostSelectMode(roomCtx.roomId, mode);
      await fetchAll();
    } catch (e) {
      console.error('[RoomLobby] failed to select mode', e);
      setActionErr('Could not select mode. Try again.');
    } finally { setBusy(false); }
  }

  /** Synchronized 3-2-1-GO countdown launch */
  async function handleStartSynced() {
    if (!selectedMode) return;
    setBusy(true); setActionErr('');
    try {
      await hostStartGame(roomCtx.roomId, selectedMode);
      hasLaunchedRef.current = false;
      await fetchAll();
    } catch (e) {
      console.error('[RoomLobby] failed to start synced game', e);
      setActionErr('Could not start game. Try again.');
    } finally { setBusy(false); }
  }

  /** Async challenge — no countdown, players tap when ready */
  async function handleStartChallenge() {
    if (!selectedMode) return;
    setBusy(true); setActionErr('');
    try {
      await hostStartChallenge(roomCtx.roomId);
      hasLaunchedRef.current = false;
      await fetchAll();
    } catch (e) {
      console.error('[RoomLobby] failed to start challenge', e);
      setActionErr('Could not start challenge. Try again.');
    } finally { setBusy(false); }
  }

  async function handleReset() {
    setBusy(true); setActionErr('');
    try {
      await resetRoom(roomCtx.roomId);
      hasLaunchedRef.current = false;
      await fetchAll();
    } catch (e) {
      console.error('[RoomLobby] failed to reset room', e);
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
      console.error('[RoomLobby] failed to start party game', e);
      setActionErr('Could not start party game.');
    } finally { setBusy(false); }
  }

  async function handleStartRound(r: RoundRow) {
    setBusy(true); setActionErr('');
    try { await startRound(r.id); await fetchAll(); }
    catch (e) {
      console.error('[RoomLobby] failed to start round', e);
      setActionErr('Could not start round.');
    } finally { setBusy(false); }
  }

  async function handleCompleteRound(r: RoundRow) {
    setBusy(true); setActionErr('');
    try { await completeRound(r.id); await fetchAll(); }
    catch (e) {
      console.error('[RoomLobby] failed to complete round', e);
      setActionErr('Could not complete round.');
    } finally { setBusy(false); }
  }

  async function handleFinishGame() {
    setBusy(true); setActionErr('');
    try { await finishPartyGame(roomCtx.roomId); navigate(`/room/${roomCtx.roomCode}/final`); }
    catch (e) {
      console.error('[RoomLobby] failed to finish game', e);
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
            onClick={() => handleSelectMode(m.id)}
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
          <p className="room-preview-empty">No players yet — invite someone!</p>
        ) : (
          <div className="room-players-list">
            {players.map(p => (
              <div key={p.id} className={`room-player-row${p.id === roomCtx.playerId ? ' room-player-row--you' : ''}`}>
                <span className="room-player-name">{p.player_name}</span>
                <div className="room-player-badges">
                  {p.id === hostPlayerId       && <span className="room-badge room-badge--host">Host</span>}
                  {p.id === roomCtx.playerId   && <span className="room-badge room-badge--you">You</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /** Challenge leaderboard for the active selected_mode */
  function renderChallengeLeaderboard() {
    if (!selectedMode) return null;
    const icon  = MODE_ICONS[selectedMode] ?? '🎮';
    const label = MODE_LABELS_FULL[selectedMode] ?? selectedMode;

    return (
      <div className="lobby-challenge-board">
        <div className="lobby-challenge-board-header">
          <span className="lobby-challenge-board-title">
            {icon} {label} — Rankings
          </span>
          <span className="lobby-challenge-board-hint">
            {LOWER_IS_BETTER.has(selectedMode) ? 'Lower is better' : 'Higher is better'}
          </span>
        </div>
        {challengeLeaderboard.length === 0 ? (
          <p className="lobby-challenge-board-empty">
            No scores yet — play to get on the board!
          </p>
        ) : (
          <div className="lobby-challenge-board-list">
            {challengeLeaderboard.map((s, i) => (
              <div
                key={s.id}
                className={`lobby-challenge-row${s.player_id === roomCtx.playerId ? ' lobby-challenge-row--you' : ''}${i < 3 ? ' lobby-challenge-row--podium' : ''}`}
              >
                <span className="lobby-challenge-rank">{rankBadge(i)}</span>
                <span className="lobby-challenge-player">{s.player_name}</span>
                <span className="lobby-challenge-score">{s.score_label}</span>
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

      {/* ════════════════════════════════════════════════════════════════════
          COMPETITIVE CHALLENGE SECTION
          ════════════════════════════════════════════════════════════════════ */}

      {/* ── Waiting / Mode selection ──────────────────────────────────────── */}
      {(gs === 'waiting' || gs === 'mode_selected') && (
        <div className="room-party-section">
          <span className="room-section-title">🏆 Competitive Challenge</span>

          {isHost ? (
            <>
              <div className="lobby-host-label">
                <span className="lobby-host-crown">👑</span> You are the host
              </div>
              <p className="room-party-hint">
                Select a game mode below. Friends see your selection in real time.
              </p>

              {renderModeSelector()}

              {selectedMode && (
                <div className="lobby-challenge-start-panel">
                  <p className="lobby-challenge-selected-label">
                    Selected: {MODE_ICONS[selectedMode]} <strong>{MODE_LABELS_FULL[selectedMode]}</strong>
                  </p>
                  <div className="lobby-challenge-start-btns">
                    <button
                      className="btn-primary room-party-start-btn"
                      onClick={handleStartChallenge}
                      disabled={busy}
                    >
                      {busy ? 'Starting…' : '🚀 Start Challenge'}
                    </button>
                    <button
                      className="btn-secondary room-party-start-btn"
                      onClick={handleStartSynced}
                      disabled={busy}
                      style={{ marginTop: 8 }}
                    >
                      {busy ? 'Starting…' : '3-2-1 Synced Start'}
                    </button>
                  </div>
                </div>
              )}

              {!selectedMode && (
                <p className="lobby-no-mode-hint">← Pick a mode above to start a challenge</p>
              )}
            </>
          ) : (
            <div className="lobby-waiting-panel">
              {selectedMode ? (
                <>
                  <div className="lobby-mode-selected-display">
                    <span className="lobby-mode-selected-icon">{MODE_ICONS[selectedMode] ?? '🎮'}</span>
                    <div>
                      <p className="lobby-mode-selected-label">Host selected</p>
                      <p className="lobby-mode-selected-name">{MODE_LABELS_FULL[selectedMode]}</p>
                    </div>
                  </div>
                  <p className="lobby-waiting-text">Waiting for host to start…</p>
                </>
              ) : (
                <>
                  <div className="lobby-waiting-spinner" />
                  <p className="lobby-waiting-text">Waiting for host to choose a game…</p>
                </>
              )}
            </div>
          )}

          {selectedMode && renderChallengeLeaderboard()}

          {actionErr && <p className="room-form-error" style={{ marginTop: 8 }}>{actionErr}</p>}
        </div>
      )}

      {/* ── Challenge Active (gs = playing) ───────────────────────────────── */}
      {gs === 'playing' && selectedMode && (
        <div className="room-party-section">
          <span className="room-section-title">
            🏆 Challenge Active — {MODE_ICONS[selectedMode]} {MODE_LABELS_FULL[selectedMode]}
          </span>

          <div className="lobby-challenge-active-panel">
            <button
              className="btn-primary room-party-start-btn lobby-play-challenge-btn"
              onClick={() => onPlayMode(selectedMode as GameMode)}
            >
              ▶ Play Challenge
            </button>
            <p className="lobby-challenge-active-hint">
              Submit your best score. Rankings update live.
            </p>
          </div>

          {renderChallengeLeaderboard()}

          {isHost && (
            <div className="lobby-host-controls">
              <button className="btn-secondary room-party-start-btn" onClick={() => {
                // Host can switch to a new challenge via reset + re-select
              }} style={{ display: 'none' }} />
              <button className="lobby-reset-btn" onClick={handleReset} disabled={busy}>
                ↺ End Challenge / New Round
              </button>
            </div>
          )}

          {actionErr && <p className="room-form-error" style={{ marginTop: 8 }}>{actionErr}</p>}
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
        {!loading && recentScores.length === 0 && (
          <p className="room-preview-empty">No scores yet — be the first!</p>
        )}
        {!loading && recentScores.length > 0 && (
          <div className="room-preview-list">
            {recentScores.map(s => (
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
