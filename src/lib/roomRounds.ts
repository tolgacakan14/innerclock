import { supabase } from './supabase';
import type { ScoreRow } from './roomScores';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RoundStatus = 'waiting' | 'active' | 'completed';

/** All possible game_status values on the rooms table. */
export type GameStatus =
  | 'waiting'          // lobby — no game in progress
  | 'mode_selected'    // host picked mode, waiting for start
  | 'countdown'        // 3-2-1-GO synced countdown in progress
  | 'challenge_active' // async competitive challenge is live
  | 'playing'          // synchronized game live (after countdown)
  | 'round_completed'  // one round finished
  | 'active'           // legacy: 5-round party system in progress
  | 'completed';       // whole party done

export interface RoundRow {
  id:           string;
  room_id:      string;
  round_number: number;
  mode:         string;
  status:       RoundStatus;
  created_at:   string;
}

export interface RoomWithStatus {
  id:                    string;
  room_code:             string;
  room_name:             string;
  host_player_id?:       string | null;
  game_status:           GameStatus;
  selected_mode?:        string | null;
  countdown_starts_at?:  string | null;
  countdown_duration?:   number | null;
  challenge_started_at?: string | null;
  active_round_id?:      string | null;
  current_round_number?: number | null;
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
  rush:        'Rush',
  color:       'Colour',
  golf:        'Golf',
  grandma:     'Grandma Walking',
  arrowEscape: 'Arrow Escape',
  time:        'Time',
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
  rush:        '▷',
  color:       '◉',
  golf:        '◈',
  grandma:     '♟',
  arrowEscape: '↗',
  time:        '◷',
  sequence:    '▣',
  memory:      '▦',
  timing:      '◆',
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
 * Fetch the full room row.
 *
 * Uses SELECT * so the query never fails due to a missing optional column
 * (countdown_starts_at, active_round_id, current_round_number).
 * Any column that doesn't exist yet simply won't be in the returned object;
 * callers handle missing fields with `?? null` guards.
 *
 * Throws for any error OTHER than "row not found" (PGRST116).
 * This is intentional: the caller (fetchAll) should keep the existing room
 * state rather than overwriting it with partial/default values.
 */
export async function getRoomWithStatus(roomId: string): Promise<RoomWithStatus | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')          // ← never fails due to missing optional columns
    .eq('id', roomId)
    .single();

  if (!error) {
    console.log('[roomRounds] getRoomWithStatus →', {
      id:            (data as { id?: string }).id,
      game_status:   (data as { game_status?: string }).game_status,
      selected_mode: (data as { selected_mode?: string }).selected_mode,
    });
    return data as unknown as RoomWithStatus;
  }

  // PGRST116 = no row found (room deleted / wrong id)
  if ((error as { code?: string }).code === 'PGRST116') {
    console.warn('[roomRounds] getRoomWithStatus: room not found (PGRST116)');
    return null;
  }

  // Any other error: throw so the caller keeps existing UI state
  // (NEVER return a partial room with selected_mode: null — that wipes the UI)
  console.error('[roomRounds] getRoomWithStatus error:', {
    message: (error as { message?: string }).message,
    code:    (error as { code?:    string }).code,
  });
  throw toError(error);
}

// ── Synchronized single-round game flow ───────────────────────────────────────

// ── Internal helper: log and throw if a rooms UPDATE affected 0 rows ──────────
function assertUpdated(
  data: unknown[] | null | undefined,
  label: string,
): void {
  if (!data || (data as unknown[]).length === 0) {
    console.error(
      `[roomRounds] ${label}: UPDATE returned 0 rows — ` +
      'likely an RLS policy is blocking write or the room does not exist. ' +
      'Run the SQL migration (Add public update policy on rooms).',
    );
    throw new Error(
      `${label} failed: Supabase UPDATE affected 0 rows. ` +
      'Check Supabase RLS — you may need: ' +
      "CREATE POLICY \"Allow public update rooms\" ON rooms FOR UPDATE USING (true) WITH CHECK (true);",
    );
  }
}

/**
 * Host selects a mode — persists to Supabase immediately.
 * Sets game_status = 'mode_selected' so non-hosts can see the selection.
 *
 * Returns the updated row so callers can do optimistic state patches.
 * Throws if 0 rows are affected (silent RLS block) or on any Supabase error.
 * Fallback: if game_status column is missing, retries with selected_mode only.
 */
export async function hostSelectMode(
  roomId: string,
  mode: string,
): Promise<{ selected_mode: string; game_status: string }> {
  console.log('[roomRounds] hostSelectMode →', { roomId, mode });

  const { data, error } = await supabase
    .from('rooms')
    .update({ selected_mode: mode, game_status: 'mode_selected' })
    .eq('id', roomId)
    .select('id, selected_mode, game_status');

  if (!error) {
    console.log('[roomRounds] hostSelectMode confirmed rows:', data);
    assertUpdated(data, 'hostSelectMode');
    const row = (data as Array<{ selected_mode: string; game_status: string }>)[0];
    return row;
  }

  const pg = error as { message?: string; code?: string; details?: string; hint?: string };
  console.error('[roomRounds] hostSelectMode error', {
    message: pg.message, code: pg.code, details: pg.details, hint: pg.hint,
  });

  const msg  = (pg.message ?? '').toLowerCase();
  const code = pg.code ?? '';

  // PostgreSQL 42703 = undefined_column: game_status/selected_mode column is missing
  if (code === '42703' || msg.includes('column') || msg.includes('does not exist')) {
    console.warn('[roomRounds] hostSelectMode: column missing — retrying with selected_mode only');
    const { data: d2, error: e2 } = await supabase
      .from('rooms')
      .update({ selected_mode: mode })
      .eq('id', roomId)
      .select('id, selected_mode');
    if (e2) {
      const pg2 = e2 as { message?: string; code?: string; details?: string; hint?: string };
      console.error('[roomRounds] hostSelectMode fallback also failed', pg2);
      throw toError(e2);
    }
    console.log('[roomRounds] hostSelectMode fallback rows:', d2);
    assertUpdated(d2, 'hostSelectMode-fallback');
    return { selected_mode: mode, game_status: 'mode_selected' };
  }

  throw toError(error);
}

/**
 * Host starts a synchronized game with a 3-2-1-GO countdown.
 * Sets selected_mode, game_status = 'countdown', countdown_starts_at = now + 3 s,
 * countdown_duration = 3.
 *
 * Returns the confirmed updated row so the caller can patch local state immediately
 * (countdown ticker fires without waiting for the next 2-second poll).
 *
 * Throws a human-readable "migration required" error if the countdown_starts_at
 * column is missing from the database (PostgreSQL error 42703).
 */
export async function hostStartGame(
  roomId: string,
  mode: string,
): Promise<{ game_status: string; countdown_starts_at: string; countdown_duration: number }> {
  console.log('[roomRounds] hostStartGame →', { roomId, mode });
  const startsAt = new Date(Date.now() + 3000).toISOString();

  const { data, error } = await supabase
    .from('rooms')
    .update({
      selected_mode:       mode,
      game_status:         'countdown',
      countdown_starts_at: startsAt,
      countdown_duration:  3,
    })
    .eq('id', roomId)
    .select('id, game_status, countdown_starts_at, countdown_duration');

  if (error) {
    const pg = error as { message?: string; code?: string; details?: string; hint?: string };
    console.error('[roomRounds] hostStartGame error', {
      message: pg.message, code: pg.code, details: pg.details, hint: pg.hint,
    });

    const msg  = (pg.message ?? '').toLowerCase();
    const code = pg.code ?? '';

    // PostgreSQL 42703 = undefined_column: countdown_starts_at / countdown_duration missing.
    // Surface a clear migration message instead of the raw schema-cache error.
    if (
      code === '42703' ||
      msg.includes('countdown_starts_at') ||
      msg.includes('countdown_duration') ||
      msg.includes('schema cache') ||
      (msg.includes('column') && msg.includes('does not exist'))
    ) {
      throw new Error(
        'Database migration required — the rooms table is missing countdown columns. ' +
        'Run this SQL in your Supabase dashboard SQL editor:\n\n' +
        'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS countdown_starts_at timestamptz;\n' +
        'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS countdown_duration int DEFAULT 3;\n' +
        'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS challenge_started_at timestamptz;',
      );
    }

    throw toError(error);
  }

  assertUpdated(data, 'hostStartGame');
  const row = (data as Array<{ game_status: string; countdown_starts_at: string; countdown_duration: number }>)[0];
  console.log('[roomRounds] hostStartGame confirmed:', row);
  return row;
}

/**
 * Host starts an async competitive challenge — no countdown.
 * All players get a "Play Challenge" button immediately.
 *
 * Returns the confirmed updated row from Supabase so the caller can apply
 * the exact DB state without a separate re-fetch (avoids stale-overwrite race).
 *
 * NOTE: intentionally does NOT touch countdown_starts_at here — that column
 * may not exist in all deployments, and this flow does not need it.
 */
export async function hostStartChallenge(
  roomId: string,
): Promise<{ game_status: string; selected_mode: string | null }> {
  console.log('[roomRounds] hostStartChallenge →', { roomId });

  const { data, error } = await supabase
    .from('rooms')
    .update({ game_status: 'challenge_active' })
    .eq('id', roomId)
    .select('id, game_status, selected_mode');

  if (error) {
    const pg = error as { message?: string; code?: string; details?: string; hint?: string };
    console.error('[roomRounds] hostStartChallenge error', {
      message: pg.message, code: pg.code, details: pg.details, hint: pg.hint,
    });
    throw toError(error);
  }

  assertUpdated(data, 'hostStartChallenge');

  const row = (data as Array<{ game_status: string; selected_mode: string | null }>)[0];
  console.log('[roomRounds] hostStartChallenge confirmed:', row);
  return row;
}

/**
 * Called by host (or first client) when countdown reaches 0 — marks game live.
 */
export async function setRoomPlaying(roomId: string): Promise<void> {
  console.log('[roomRounds] setRoomPlaying →', { roomId });
  const { data, error } = await supabase
    .from('rooms')
    .update({ game_status: 'playing' })
    .eq('id', roomId)
    .select('id, game_status');
  if (error) {
    const pg = error as { message?: string; code?: string; details?: string; hint?: string };
    console.error('[roomRounds] setRoomPlaying error', { message: pg.message, code: pg.code, details: pg.details, hint: pg.hint });
    throw toError(error);
  }
  // Non-fatal if 0 rows (another client may have already set it)
  if (!data || (data as unknown[]).length === 0) {
    console.warn('[roomRounds] setRoomPlaying: 0 rows updated (may be a concurrent write)');
  }
}

/**
 * Host resets room back to lobby / waiting state after a challenge ends.
 *
 * Clears all active-challenge fields so the host can pick a new game.
 * Players and scores are NOT touched — only the rooms row is updated.
 *
 * Returns the full confirmed room row so the caller can apply it to local
 * state immediately without waiting for the next poll cycle.
 *
 * Robustness: if any of the optional columns are missing (PostgreSQL 42703 /
 * schema-cache error), falls back to a minimal update containing only the two
 * core columns (game_status, selected_mode) that have existed since day one.
 * This guarantees the reset always succeeds even on unpatched databases.
 */
export async function resetRoom(roomId: string): Promise<RoomWithStatus> {
  console.log('[roomRounds] resetRoom →', { roomId });

  // Full payload — clears every challenge-state field the UI cares about.
  const { data, error } = await supabase
    .from('rooms')
    .update({
      game_status:          'waiting',
      selected_mode:        null,
      countdown_starts_at:  null,
      countdown_duration:   3,
      challenge_started_at: null,
      active_round_id:      null,
      current_round_number: null,
    })
    .eq('id', roomId)
    .select('*');

  if (!error) {
    assertUpdated(data, 'resetRoom');
    const row = (data as unknown[])[0] as RoomWithStatus;
    console.log('[roomRounds] resetRoom confirmed:', row);
    return row;
  }

  // ── Fallback for missing optional columns (42703 / schema cache) ────────────
  const pg   = error as { message?: string; code?: string; details?: string; hint?: string };
  const msg  = (pg.message ?? '').toLowerCase();
  const code = pg.code ?? '';
  console.error('[roomRounds] resetRoom error', {
    message: pg.message, code: pg.code, details: pg.details, hint: pg.hint,
  });

  const isMissingColumn =
    code === '42703' ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('column');

  if (isMissingColumn) {
    // Minimal fallback: only the two columns guaranteed to exist.
    // This clears the active game state regardless of schema version.
    console.warn('[roomRounds] resetRoom: optional columns missing — falling back to minimal reset');
    const { data: d2, error: e2 } = await supabase
      .from('rooms')
      .update({ game_status: 'waiting', selected_mode: null })
      .eq('id', roomId)
      .select('*');
    if (e2) throw toError(e2);
    assertUpdated(d2, 'resetRoom-minimal');
    const row2 = (d2 as unknown[])[0] as RoomWithStatus;
    console.log('[roomRounds] resetRoom minimal confirmed:', row2);
    return row2;
  }

  throw toError(error);
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
