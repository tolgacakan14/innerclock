import { supabase } from './supabase';
import type { ScoreRow } from './roomScores';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RoundStatus = 'waiting' | 'active' | 'completed';

/** All possible game_status values on the rooms table. */
export type GameStatus =
  | 'waiting'         // lobby — no game in progress
  | 'mode_selected'   // host picked mode, waiting for start
  | 'countdown'       // 3-2-1-GO synced countdown in progress
  | 'playing'         // challenge is live (async competitive)
  | 'round_completed' // one round finished
  | 'active'          // legacy: 5-round party system in progress
  | 'completed';      // whole party done

export interface RoundRow {
  id:           string;
  room_id:      string;
  round_number: number;
  mode:         string;
  status:       RoundStatus;
  created_at:   string;
}

export interface RoomWithStatus {
  id:                   string;
  room_code:            string;
  room_name:            string;
  host_player_id:       string | null;
  game_status:          GameStatus;
  selected_mode:        string | null;
  countdown_starts_at:  string | null;
  active_round_id:      string | null;
  current_round_number: number | null;
}

export interface LobbyPlayerRow {
  id:          string;
  room_id:     string;
  player_name: string;
  created_at:  string;
}

// ── Default 5-round sequence ──────────────────────────────────────────────────
export const DEFAULT_ROUND_MODES: string[] = [
  'rush', 'color', 'golf', 'grandma', 'arrowEscape',
];

export const MODE_LABELS: Record<string, string> = {
  rush:        'Rush',
  color:       'Colour',
  golf:        'Golf',
  grandma:     'Grandma',
  arrowEscape: 'Arrow Escape',
  time:        'Time',
  sequence:    'Sequence',
  memory:      'Memory',
  timing:      'Timing',
};

export const MODE_LABELS_FULL: Record<string, string> = {
  rush:        'Rush Mode',
  color:       'Colour Mode',
  golf:        'Golf Mode',
  grandma:     'Grandma Walking',
  arrowEscape: 'Arrow Escape',
  time:        'Time Mode',
  sequence:    'Sequence Tap',
  memory:      'Memory Grid',
  timing:      'Tap Timing',
};

/** The mode string stored in the scores table for each game mode key. */
export const MODE_SCORE_LABEL: Record<string, string> = {
  rush:        'Rush Mode',
  color:       'Colour Mode',
  golf:        'Golf Mode',
  grandma:     'Grandma Walking',
  arrowEscape: 'Arrow Escape',
  time:        'Time Mode',
  sequence:    'Sequence Tap',
  memory:      'Memory Grid',
  timing:      'Tap Timing',
};

export const MODE_ICONS: Record<string, string> = {
  rush:        '⚡',
  color:       '🎨',
  golf:        '⛳',
  grandma:     '👵',
  arrowEscape: '🏹',
  time:        '⏱',
  sequence:    '🔢',
  memory:      '🧠',
  timing:      '🎯',
};

/** Modes where lower score is better (shots, seconds). */
export const LOWER_IS_BETTER = new Set(['golf', 'arrowEscape']);

// ── Error helper ──────────────────────────────────────────────────────────────
function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (e && typeof e === 'object') {
    const pg = e as { message?: string; code?: string; details?: string };
    return new Error(pg.message ?? pg.details ?? pg.code ?? JSON.stringify(e));
  }
  return new Error(String(e));
}

// ── Host repair ───────────────────────────────────────────────────────────────

/**
 * Repair host_player_id when it is null (e.g. column was just added by migration).
 * Uses .is('host_player_id', null) so it NEVER overwrites a valid existing host.
 */
export async function repairHostPlayerId(roomId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({ host_player_id: playerId })
    .eq('id', roomId)
    .is('host_player_id', null); // only when null — never steal host
  if (error) throw toError(error);
}

// ── Players ───────────────────────────────────────────────────────────────────

export async function getLobbyPlayers(roomId: string): Promise<LobbyPlayerRow[]> {
  const { data, error } = await supabase
    .from('players')
    .select('id, room_id, player_name, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  if (error) throw toError(error);
  return (data ?? []) as LobbyPlayerRow[];
}

// ── Room status ───────────────────────────────────────────────────────────────

/**
 * Fetch room with all status columns.
 * Falls back to basic room data if extended columns don't exist in the schema yet.
 * This ensures the lobby still loads even if the SQL migration hasn't been run.
 */
export async function getRoomWithStatus(roomId: string): Promise<RoomWithStatus | null> {
  // Try full schema first
  const { data, error } = await supabase
    .from('rooms')
    .select(
      'id, room_code, room_name, host_player_id, game_status, ' +
      'selected_mode, countdown_starts_at, active_round_id, current_round_number',
    )
    .eq('id', roomId)
    .single();

  if (!error) {
    return data as unknown as RoomWithStatus;
  }

  // If PGRST116, room simply doesn't exist
  if ((error as { code?: string }).code === 'PGRST116') {
    return null;
  }

  // Extended columns may not exist yet — fall back to basic select
  console.warn('[roomRounds] getRoomWithStatus full select failed, falling back to basic:', error.message);

  const { data: basic, error: basicErr } = await supabase
    .from('rooms')
    .select('id, room_code, room_name')
    .eq('id', roomId)
    .single();

  if (basicErr) {
    if ((basicErr as { code?: string }).code === 'PGRST116') return null;
    throw toError(basicErr);
  }
  if (!basic) return null;

  // Return a RoomWithStatus with defaults for missing columns
  return {
    ...(basic as { id: string; room_code: string; room_name: string }),
    host_player_id:       null,
    game_status:          'waiting',
    selected_mode:        null,
    countdown_starts_at:  null,
    active_round_id:      null,
    current_round_number: null,
  } as RoomWithStatus;
}

// ── Synchronized single-round game flow ───────────────────────────────────────

/**
 * Host selects a mode — persists to Supabase immediately.
 * Sets game_status = 'mode_selected' so non-hosts can see the selection.
 */
export async function hostSelectMode(roomId: string, mode: string): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({ selected_mode: mode, game_status: 'mode_selected' })
    .eq('id', roomId);
  if (error) throw toError(error);
}

/**
 * Host starts a synchronized game with a 3-2-1-GO countdown.
 * Sets selected_mode, game_status = 'countdown', countdown_starts_at = now + 3 s.
 */
export async function hostStartGame(roomId: string, mode: string): Promise<void> {
  const startsAt = new Date(Date.now() + 3000).toISOString();
  const { error } = await supabase
    .from('rooms')
    .update({
      selected_mode:       mode,
      game_status:         'countdown',
      countdown_starts_at: startsAt,
    })
    .eq('id', roomId);
  if (error) throw toError(error);
}

/**
 * Host starts a challenge without a countdown (async competitive mode).
 * All players get a "Play Challenge" button immediately.
 */
export async function hostStartChallenge(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({ game_status: 'playing', countdown_starts_at: null })
    .eq('id', roomId);
  if (error) throw toError(error);
}

/**
 * Called by host (or first client) when countdown reaches 0 — marks game live.
 */
export async function setRoomPlaying(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({ game_status: 'playing' })
    .eq('id', roomId);
  if (error) throw toError(error);
}

/**
 * Host resets room back to lobby state.
 */
export async function resetRoom(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({
      game_status:         'waiting',
      selected_mode:       null,
      countdown_starts_at: null,
      active_round_id:     null,
    })
    .eq('id', roomId);
  if (error) throw toError(error);
}

// ── 5-Round party system ──────────────────────────────────────────────────────

export async function getRoomRounds(roomId: string): Promise<RoundRow[]> {
  const { data, error } = await supabase
    .from('room_rounds')
    .select('*')
    .eq('room_id', roomId)
    .order('round_number', { ascending: true });

  if (error) {
    // If the table doesn't exist yet, return empty rather than crashing
    const msg = (error as { message?: string }).message ?? '';
    if (msg.includes('does not exist') || msg.includes('relation')) {
      console.warn('[roomRounds] room_rounds table not found — returning empty');
      return [];
    }
    throw toError(error);
  }
  return (data ?? []) as RoundRow[];
}

/** Create all 5 rounds and flip room to legacy 'active' state. */
export async function startPartyGame(roomId: string): Promise<RoundRow[]> {
  const rows = DEFAULT_ROUND_MODES.map((mode, i) => ({
    room_id:      roomId,
    round_number: i + 1,
    mode,
    status:       'waiting' as RoundStatus,
  }));

  const { data, error } = await supabase
    .from('room_rounds')
    .insert(rows)
    .select();
  if (error) throw toError(error);

  const { error: e2 } = await supabase
    .from('rooms')
    .update({ game_status: 'active' })
    .eq('id', roomId);
  if (e2) throw toError(e2);

  return (data ?? []) as RoundRow[];
}

export async function startRound(roundId: string): Promise<void> {
  const { error } = await supabase
    .from('room_rounds')
    .update({ status: 'active' })
    .eq('id', roundId);
  if (error) throw toError(error);
}

export async function completeRound(roundId: string): Promise<void> {
  const { error } = await supabase
    .from('room_rounds')
    .update({ status: 'completed' })
    .eq('id', roundId);
  if (error) throw toError(error);
}

export async function finishPartyGame(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({ game_status: 'completed' })
    .eq('id', roomId);
  if (error) throw toError(error);
}

// ── Rank-points scoring ───────────────────────────────────────────────────────
const RANK_POINTS = [10, 7, 5, 3, 1];

export function getRankPoints(rank: number): number {
  return RANK_POINTS[Math.min(rank - 1, RANK_POINTS.length - 1)];
}

export function calcRoundRankPoints(scores: ScoreRow[]): Map<string, number> {
  if (scores.length === 0) return new Map();

  const bestByPlayer = new Map<string, ScoreRow>();
  for (const s of scores) {
    const existing = bestByPlayer.get(s.player_id);
    if (!existing) {
      bestByPlayer.set(s.player_id, s);
    } else {
      const isHigher = s.score_type === 'higher_is_better';
      const better   = isHigher
        ? s.score_value > existing.score_value
        : s.score_value < existing.score_value;
      if (better) bestByPlayer.set(s.player_id, s);
    }
  }

  const deduped  = Array.from(bestByPlayer.values());
  const isHigher = deduped[0].score_type === 'higher_is_better';
  const sorted   = [...deduped].sort((a, b) =>
    isHigher ? b.score_value - a.score_value : a.score_value - b.score_value,
  );

  const result = new Map<string, number>();
  let   rank   = 1;
  sorted.forEach((s, i) => {
    if (i > 0 && sorted[i].score_value !== sorted[i - 1].score_value) rank = i + 1;
    result.set(s.player_id, getRankPoints(rank));
  });
  return result;
}
