import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { RoomContext } from '../types';
import { getRoomScores, type ScoreRow } from '../lib/roomScores';
import {
  getRoomRounds,
  getRoomWithStatus,
  getLobbyPlayers,
  calcRoundRankPoints,
  MODE_LABELS,
  MODE_ICONS,
  type RoundRow,
  type RoomWithStatus,
  type LobbyPlayerRow,
} from '../lib/roomRounds';
import { loadRoomPlayer } from '../lib/roomStorage';

// ── Props — can be used standalone (route) or embedded (hub) ──────────────────
interface Props {
  roomCtx?:      RoomContext;
  onBackToLobby?: () => void;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlayerResult {
  playerId:   string;
  playerName: string;
  totalPts:   number;
  roundPts:   Record<number, number>;   // round_number → pts
}

const RANK_MEDAL = ['🥇', '🥈', '🥉'];

function getRankMedal(rank: number): string {
  return RANK_MEDAL[rank - 1] ?? `#${rank}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RoomFinalScreen({ roomCtx: propCtx, onBackToLobby }: Props) {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate     = useNavigate();

  // Resolve context: prop (when embedded in hub) or localStorage (standalone route)
  const code = (roomCode ?? propCtx?.roomCode ?? '').toUpperCase();
  const ctx  = propCtx ?? (code ? loadRoomPlayer(code) : null);

  const [room,        setRoom]        = useState<RoomWithStatus | null>(null);
  const [rounds,      setRounds]      = useState<RoundRow[]>([]);
  const [scores,      setScores]      = useState<ScoreRow[]>([]);
  const [players,     setPlayers]     = useState<LobbyPlayerRow[]>([]);
  const [results,     setResults]     = useState<PlayerResult[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [copyDone,    setCopyDone]    = useState(false);
  const [expandedRnd, setExpandedRnd] = useState<number | null>(null);

  // ── Fetch everything ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!ctx?.roomId) { setLoading(false); return; }

    (async () => {
      try {
        const [rm, rds, sc, pl] = await Promise.all([
          getRoomWithStatus(ctx.roomId),
          getRoomRounds(ctx.roomId),
          getRoomScores(ctx.roomId),
          getLobbyPlayers(ctx.roomId),
        ]);
        setRoom(rm);
        setRounds(rds);
        setScores(sc);
        setPlayers(pl);
        setResults(buildResults(rds, sc, pl));
      } catch (e) {
        console.error('[RoomFinalScreen] fetch error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [ctx?.roomId]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Calculate rank-points from rounds × scores ─────────────────────────────
  function buildResults(
    rds: RoundRow[],
    sc:  ScoreRow[],
    pl:  LobbyPlayerRow[],
  ): PlayerResult[] {
    // Build a map of playerId → result
    const map = new Map<string, PlayerResult>();

    for (const p of pl) {
      map.set(p.id, {
        playerId:   p.id,
        playerName: p.player_name,
        totalPts:   0,
        roundPts:   {},
      });
    }

    for (const rd of rds) {
      const roundScores = sc.filter(s => s.round_id === rd.id);
      if (roundScores.length === 0) continue;

      const pts = calcRoundRankPoints(roundScores);
      pts.forEach((p, playerId) => {
        let entry = map.get(playerId);
        if (!entry) {
          // Player who played but isn't in pl list (edge case)
          const name = roundScores.find(s => s.player_id === playerId)?.player_name ?? playerId;
          entry = { playerId, playerName: name, totalPts: 0, roundPts: {} };
          map.set(playerId, entry);
        }
        entry.roundPts[rd.round_number] = p;
        entry.totalPts += p;
      });
    }

    return Array.from(map.values()).sort((a, b) => b.totalPts - a.totalPts);
  }

  // ── Copy results text ──────────────────────────────────────────────────────
  function handleCopyResults() {
    const lines: string[] = [
      `🏆 ${room?.room_name ?? ctx?.roomName ?? 'Party Game'} — Final Results`,
      '',
      ...results.map((r, i) =>
        `${getRankMedal(i + 1)} ${r.playerName} — ${r.totalPts} pts`,
      ),
    ];
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }

  function handleBack() {
    if (onBackToLobby) {
      onBackToLobby();
    } else {
      navigate(`/room/${code}`);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="screen room-loading-screen">
        <div className="room-loading-spinner" aria-label="Loading results…" />
        <p className="room-loading-text">Loading results…</p>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="screen room-notfound-screen">
        <span className="room-notfound-icon">🔍</span>
        <h2 className="room-notfound-title">Room not found</h2>
        <button className="btn-primary" onClick={() => navigate('/')}>← Home</button>
      </div>
    );
  }

  const roomName = room?.room_name ?? ctx.roomName;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="screen final-screen">
      {/* Header */}
      <div className="final-header">
        <span className="final-trophy">🏆</span>
        <h2 className="final-title">Final Results</h2>
        <p className="final-sub">{roomName} · {code}</p>
      </div>

      {/* Leaderboard */}
      {results.length === 0 ? (
        <p className="final-empty">No round scores recorded yet.</p>
      ) : (
        <div className="final-leaderboard">
          {results.map((r, i) => {
            const rank = i + 1;
            return (
              <div
                key={r.playerId}
                className={`final-row${rank <= 3 ? ' final-row--podium' : ''}`}
              >
                <span className="final-rank">{getRankMedal(rank)}</span>
                <span className="final-player">{r.playerName}</span>
                {ctx?.playerId === r.playerId && (
                  <span className="room-badge room-badge--you">You</span>
                )}
                <span className="final-pts">{r.totalPts} pts</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-round breakdown */}
      {rounds.length > 0 && (
        <div className="final-breakdown">
          <p className="room-section-title" style={{ marginBottom: 10 }}>
            Per-Round Breakdown
          </p>
          {rounds.map(rd => {
            const roundScores = scores.filter(s => s.round_id === rd.id);
            const isOpen      = expandedRnd === rd.round_number;

            if (roundScores.length === 0) return null;

            // Sort round scores for display
            const isHigher = roundScores[0]?.score_type === 'higher_is_better';
            const sorted   = [...roundScores].sort((a, b) =>
              isHigher ? b.score_value - a.score_value : a.score_value - b.score_value,
            );

            return (
              <div key={rd.id} className="final-round-block">
                <button
                  className="final-round-toggle"
                  onClick={() => setExpandedRnd(isOpen ? null : rd.round_number)}
                >
                  <span>
                    {MODE_ICONS[rd.mode]} Round {rd.round_number} — {MODE_LABELS[rd.mode]}
                  </span>
                  <span className="final-round-chevron">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="final-round-rows">
                    {sorted.map((s, i) => {
                      const pts = results
                        .find(r => r.playerId === s.player_id)
                        ?.roundPts[rd.round_number] ?? 0;
                      return (
                        <div key={s.id} className="final-round-score-row">
                          <span className="final-round-rank">{getRankMedal(i + 1)}</span>
                          <span className="final-round-player">{s.player_name}</span>
                          <span className="final-round-score">{s.score_label}</span>
                          <span className="final-round-pts">+{pts} pts</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="final-actions">
        <button
          className="btn-primary"
          onClick={handleCopyResults}
        >
          {copyDone ? '✓ Copied!' : '📋 Copy Results'}
        </button>
        <button className="btn-ghost" onClick={handleBack}>
          ← Back to Lobby
        </button>
      </div>
    </div>
  );
}
