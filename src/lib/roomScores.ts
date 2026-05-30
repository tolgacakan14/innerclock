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
  id:          string;
  room_id:     string;
  player_id:   string;
  player_name: string;
  mode:        string;
  score_value: number;
  score_label: string;
  score_type:  ScoreType;
  created_at:  string;
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
  roomId:     string;
  playerId:   string;
  playerName: string;
  mode:       string;
  scoreValue: number;
  scoreLabel: string;
  scoreType:  ScoreType;
}

export async function submitRoomScore(params: SubmitScoreParams): Promise<void> {
  const { error } = await supabase.from('scores').insert({
    room_id:     params.roomId,
    player_id:   params.playerId,
    player_name: params.playerName,
    mode:        params.mode,
    score_value: params.scoreValue,
    score_label: params.scoreLabel,
    score_type:  params.scoreType,
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
