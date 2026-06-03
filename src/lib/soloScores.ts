import { supabase } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SoloScoreRow {
  id:           string;
  player_name:  string;
  mode:         string;
  score_value:  number;
  score_label:  string | null;
  score_type:   string;
  completed_at: string;
  created_at:   string;
}

// ── Mode metadata ─────────────────────────────────────────────────────────────

/** Modes that sort ascending (lower score = better). */
export const SOLO_LOWER_IS_BETTER = new Set<string>(['Golf Mode', 'Arrow Escape']);

export function soloScoreType(mode: string): 'lower_is_better' | 'higher_is_better' {
  return SOLO_LOWER_IS_BETTER.has(mode) ? 'lower_is_better' : 'higher_is_better';
}

/** Display order of modes on the Solo All-Time leaderboard. */
export const SOLO_MODE_LIST = [
  'Rush Mode',
  'Colour Mode',
  'Golf Mode',
  'Grandma Walking',
  'Arrow Escape',
  'Time Mode',
  'Sequence Tap',
  'Memory Grid',
  'Tap Timing',
] as const;

export type SoloMode = (typeof SOLO_MODE_LIST)[number];

/** Short tab labels for each mode. */
export const SOLO_MODE_LABELS: Record<string, string> = {
  'Rush Mode':       'Rush',
  'Colour Mode':     'Colour',
  'Golf Mode':       'Golf',
  'Grandma Walking': 'Grandma',
  'Arrow Escape':    'Arrow',
  'Time Mode':       'Time',
  'Sequence Tap':    'Sequence',
  'Memory Grid':     'Memory',
  'Tap Timing':      'Timing',
};

// ── Submit ────────────────────────────────────────────────────────────────────

export interface SubmitSoloParams {
  playerName:  string;
  mode:        string;
  scoreValue:  number;
  scoreLabel:  string;
  scoreType:   'higher_is_better' | 'lower_is_better';
  runId?:      string;
}

export async function submitSoloScore(params: SubmitSoloParams): Promise<void> {
  const { playerName, mode, scoreValue, scoreLabel, scoreType, runId } = params;

  const payload: Record<string, unknown> = {
    player_name: playerName.trim() || 'Anonymous',
    mode,
    score_value: scoreValue,
    score_label: scoreLabel,
    score_type:  scoreType,
  };
  if (runId) payload.run_id = runId;

  if (import.meta.env.DEV) {
    console.log('[SoloScores] Submitting:', payload);
  }

  const { error } = await supabase.from('solo_scores').insert(payload);

  if (error) {
    console.error('[SoloScores] Submit error:', {
      message: error.message,
      code:    error.code,
      details: error.details,
      hint:    error.hint,
    });
    const msg  = (error.message ?? '').toLowerCase();
    const code = error.code ?? '';

    if (msg.includes('does not exist') || msg.includes('relation') || code === '42P01') {
      throw new Error('TABLE_MISSING: solo_scores table does not exist. Run the SQL migration.');
    }
    if (msg.includes('permission') || msg.includes('policy') || code === '42501' || code === 'PGRST301') {
      throw new Error('PERMISSION_DENIED: RLS is blocking insert on solo_scores.');
    }
    if (msg.includes('unique') || msg.includes('duplicate') || code === '23505') {
      throw new Error('DUPLICATE: This run was already submitted.');
    }
    throw new Error(error.message ?? 'Unknown Supabase error');
  }

  if (import.meta.env.DEV) {
    console.log('[SoloScores] Submitted successfully!');
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function getSoloLeaderboard(mode: string): Promise<SoloScoreRow[]> {
  const ascending = SOLO_LOWER_IS_BETTER.has(mode);

  const { data, error } = await supabase
    .from('solo_scores')
    .select('*')
    .eq('mode', mode)
    .order('score_value', { ascending })
    .limit(50);

  if (error) {
    console.error('[SoloScores] Leaderboard fetch error:', {
      message: error.message,
      code:    error.code,
      details: error.details,
      hint:    error.hint,
    });
    const msg  = (error.message ?? '').toLowerCase();
    const code = error.code ?? '';
    if (msg.includes('does not exist') || msg.includes('relation') || code === '42P01') {
      throw new Error('TABLE_MISSING');
    }
    throw new Error(error.message ?? 'Fetch failed');
  }

  return (data ?? []) as SoloScoreRow[];
}
