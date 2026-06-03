import { supabase } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailyGameResult {
  mode:            string;
  rawScore:        number;
  normalizedScore: number;
  label:           string;
  lowerIsBetter:   boolean;
}

export interface DailyChallengeRecord {
  id:           string;
  player_name:  string;
  daily_date:   string;   // 'YYYY-MM-DD' UTC
  daily_seed:   string;   // 'daily-YYYY-MM-DD'
  final_score:  number;
  game_results: DailyGameResult[];
  games_played: string[];
  completed_at: string;
  created_at:   string;
}

// ── Error helper ──────────────────────────────────────────────────────────────

function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (e && typeof e === 'object') {
    const pg = e as { message?: string; code?: string; details?: string };
    return new Error(pg.message ?? pg.details ?? pg.code ?? JSON.stringify(e));
  }
  return new Error(String(e));
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Today's UTC date as 'YYYY-MM-DD'.
 * Using UTC means every player on the same calendar day globally gets the same
 * 5-game set — maximally fair for the daily leaderboard.
 */
export function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/** Human-readable English date label, e.g. "Wednesday, June 4". */
export function formatLocalDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

// ── Daily seed + game selection ───────────────────────────────────────────────

const ALL_GAMES = [
  'time', 'color', 'rush', 'golf', 'grandma',
  'arrowEscape', 'sequence', 'memory', 'timing',
] as const;

/**
 * Deterministically pick 5 of the 9 games for a given date string.
 *
 * Algorithm: FNV-1a hash of the date string → Mulberry32 PRNG seed →
 * Fisher-Yates shuffle of ALL_GAMES → take first 5.
 *
 * Same date always returns the same 5 games in the same order.
 * All players globally see the same Daily Challenge on the same UTC day.
 */
export function getDailyGames(dateStr?: string): string[] {
  const seed = dateStr ?? getTodayUTC();

  // FNV-1a → 32-bit hash for Mulberry32 seed
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x01000193) >>> 0;
  }
  if (h === 0) h = 1;

  // Mulberry32 PRNG
  function rng(): number {
    let t = (h += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const pool = [...ALL_GAMES] as string[];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5);
}

// ── Score normalisation ───────────────────────────────────────────────────────

/**
 * Convert a game's raw score to a 0–100 contribution for the Daily total.
 *
 * Calibrated against typical score ranges observed in each game:
 *   time / color  — 0–500  (5 rounds × 100)
 *   rush / timing — 0–500  (tap-based, scales to ~500 max)
 *   grandma       — 0–120  s survived (3 rounds)
 *   sequence      — 0–200  completedLevels*10 + maxSeq*5
 *   memory        — 0–300  completedRounds*20 + cells*3
 *   golf          — shots  (lower = better; 5 holes, ideal ~5 shots)
 *   arrowEscape   — seconds (lower = better; ~20–300 s penalised)
 *
 * Result is clamped to [0, 100].
 */
export function normalizeScore(
  mode: string,
  rawScore: number,
  lowerIsBetter: boolean,
): number {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  if (lowerIsBetter) {
    switch (mode) {
      // Golf: 5 holes; 5 shots (1/hole) → 100, 45+ shots → 0
      case 'golf':
        return clamp(100 - (rawScore - 5) * 2.5);
      // Arrow Escape: penalised solve time; ~20 s → 100, ~240 s → 0
      case 'arrowEscape':
        return clamp(100 - (rawScore - 20) * 0.455);
      default:
        return clamp(100 - rawScore);
    }
  }

  switch (mode) {
    case 'time':     return clamp(rawScore / 5);       // 500 → 100
    case 'color':    return clamp(rawScore / 5);       // 500 → 100
    case 'rush':     return clamp(rawScore / 5);       // 500 → 100
    case 'grandma':  return clamp(rawScore / 1.2);     // 120 s → 100
    case 'sequence': return clamp(rawScore / 2);       // 200  → 100
    case 'memory':   return clamp(rawScore / 3);       // 300  → 100
    case 'timing':   return clamp(rawScore / 5);       // 500  → 100
    default:         return clamp(rawScore);
  }
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

/**
 * Persist one Daily Challenge attempt to the `daily_challenge_scores` table.
 * Each call inserts a new row; the leaderboard de-duplicates client-side to
 * show the best attempt per player per day.
 */
export async function submitDailyChallengeScore(
  playerName:   string,
  finalScore:   number,
  gameResults:  DailyGameResult[],
  gamesPlayed:  string[],
  dailyDate?:   string,
): Promise<void> {
  const date    = dailyDate ?? getTodayUTC();
  const seed    = `daily-${date}`;
  const payload = {
    player_name:  playerName.trim() || 'Anonymous',
    daily_date:   date,
    daily_seed:   seed,
    final_score:  finalScore,
    game_results: gameResults,
    games_played: gamesPlayed,
  };

  if (import.meta.env.DEV) {
    console.log('[DailyChallenge] Submitting:', payload);
  }

  const { error } = await supabase.from('daily_challenge_scores').insert(payload);

  if (error) {
    console.error('[DailyChallenge] Submit error:', {
      message: error.message,
      code:    error.code,
      details: error.details,
      hint:    error.hint,
    });

    const msg  = (error.message ?? '').toLowerCase();
    const code = error.code ?? '';

    if (msg.includes('does not exist') || msg.includes('relation') || code === '42P01') {
      throw new Error(
        'TABLE_MISSING: The daily_challenge_scores table does not exist. ' +
        'Run the SQL migration in your Supabase SQL Editor.',
      );
    }
    if (msg.includes('permission') || msg.includes('policy') || code === '42501' || code === 'PGRST301') {
      throw new Error(
        'PERMISSION_DENIED: Row-level security is blocking the insert. ' +
        'Add an INSERT policy for the anon role on daily_challenge_scores.',
      );
    }

    throw toError(error);
  }

  if (import.meta.env.DEV) {
    console.log('[DailyChallenge] Score saved successfully!');
  }
}

/**
 * Fetch all Daily Challenge scores for a given UTC date.
 * Returns up to 200 raw rows (multiple attempts per player allowed).
 * The caller is responsible for de-duplicating by player_name.
 */
export async function getDailyLeaderboard(
  dateStr?: string,
): Promise<DailyChallengeRecord[]> {
  const date = dateStr ?? getTodayUTC();
  const { data, error } = await supabase
    .from('daily_challenge_scores')
    .select('*')
    .eq('daily_date', date)
    .order('final_score', { ascending: false })
    .limit(200);
  if (error) {
    console.error('[DailyChallenge] Leaderboard fetch error:', {
      message: error.message,
      code:    error.code,
      details: error.details,
      hint:    error.hint,
    });
    throw toError(error);
  }
  return (data ?? []) as DailyChallengeRecord[];
}

/**
 * Fetch ALL Daily Challenge attempts for a given UTC date (no deduplication).
 * Ordered by final_score DESC, then completed_at ASC as tie-breaker.
 * Used for the full "All Scores" view.
 */
export async function getAllDailyScores(
  dateStr?: string,
): Promise<DailyChallengeRecord[]> {
  const date = dateStr ?? getTodayUTC();
  const { data, error } = await supabase
    .from('daily_challenge_scores')
    .select('*')
    .eq('daily_date', date)
    .order('final_score', { ascending: false })
    .order('completed_at', { ascending: true })
    .limit(500);
  if (error) {
    console.error('[DailyChallenge] All scores fetch error:', {
      message: error.message,
      code:    error.code,
      details: error.details,
      hint:    error.hint,
    });
    throw toError(error);
  }
  return (data ?? []) as DailyChallengeRecord[];
}

/**
 * De-duplicate raw leaderboard rows to one entry per player_name,
 * keeping the highest final_score, then return sorted descending.
 */
export function deduplicateLeaderboard(
  rows: DailyChallengeRecord[],
): DailyChallengeRecord[] {
  const best = new Map<string, DailyChallengeRecord>();
  for (const r of rows) {
    const existing = best.get(r.player_name);
    if (!existing || r.final_score > existing.final_score) {
      best.set(r.player_name, r);
    }
  }
  return [...best.values()].sort((a, b) => b.final_score - a.final_score);
}
