import { supabase } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScoreType = 'higher_is_better' | 'lower_is_better';

export interface RoomRow {
  id:         string;
  room_code:  string;
  room_name:  string;
  created_at: string;
}

export interface PlayerRow {
  id:          string;
  room_id:     string;
  player_name: string;
  created_at:  string;
}

export interface ScoreRow {
  id:           string;
  room_id:      string;
  player_id:    string;
  player_name:  string;
  mode:         string;
  score_value:  number;
  score_label:  string;
  score_type:   ScoreType;
  created_at:   string;
  round_id?:    string | null;
  round_number?: number | null;
}

// ── Error normaliser ──────────────────────────────────────────────────────────
// Supabase returns PostgrestError (plain object, not instanceof Error).
// This converts it to a proper Error so catch blocks always get .message.
function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (e && typeof e === 'object') {
    const pg = e as { message?: string; code?: string; details?: string; hint?: string };
    const msg = pg.message ?? pg.details ?? pg.code ?? JSON.stringify(e);
    return new Error(msg);
  }
  return new Error(String(e));
}

// ── Room code generator ───────────────────────────────────────────────────────
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  return Array.from(
    { length: 7 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('');
}

// ── Room helpers ──────────────────────────────────────────────────────────────

export async function getRoomByCode(code: string): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_code', code.trim().toUpperCase())
    .single();
  // PGRST116 = "no rows returned" — not an error, just means room doesn't exist
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw toError(error);
  }
  return data as RoomRow | null;
}

// ── Player helpers ────────────────────────────────────────────────────────────

export async function createPlayer(roomId: string, playerName: string): Promise<PlayerRow> {
  const { data, error } = await supabase
    .from('players')
    .insert({ room_id: roomId, player_name: playerName.trim() })
    .select()
    .single();
  if (error) throw toError(error);
  return data as PlayerRow;
}

// ── Score helpers ─────────────────────────────────────────────────────────────

export interface SubmitScoreParams {
  roomId:      string;
  playerId:    string;
  playerName:  string;
  mode:        string;
  scoreValue:  number;
  scoreLabel:  string;
  scoreType:   ScoreType;
  /** Optional — set when submitted inside a party round. */
  roundId?:    string;
  roundNumber?: number;
}

export async function submitRoomScore(params: SubmitScoreParams): Promise<void> {
  const { error } = await supabase.from('scores').insert({
    room_id:      params.roomId,
    player_id:    params.playerId,
    player_name:  params.playerName,
    mode:         params.mode,
    score_value:  params.scoreValue,
    score_label:  params.scoreLabel,
    score_type:   params.scoreType,
    ...(params.roundId    !== undefined && { round_id:     params.roundId }),
    ...(params.roundNumber !== undefined && { round_number: params.roundNumber }),
  });
  if (error) throw toError(error);
}

export async function getRoomScores(roomId: string): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });
  if (error) throw toError(error);
  return (data ?? []) as ScoreRow[];
}

/**
 * Fetch all scores across every room (no room_id filter).
 * Used to build the all-time top-5 leaderboard per game mode.
 * A practical limit of 5000 rows covers any realistic dataset;
 * client-side grouping and sorting then builds the top-5 cards.
 */
export async function getAllTimeTopScores(): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) throw toError(error);
  return (data ?? []) as ScoreRow[];
}
