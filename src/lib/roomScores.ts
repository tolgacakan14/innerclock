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

// ── Room code generator ───────────────────────────────────────────────────────
// Avoids O/0/I/1 to reduce confusion.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
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
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as RoomRow | null;
}

export async function createRoom(roomName: string): Promise<RoomRow> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert({ room_code: code, room_name: roomName.trim() })
      .select()
      .single();

    if (!error && data) return data as RoomRow;

    // On unique-constraint collision try again; otherwise rethrow.
    const msg = (error?.message ?? '').toLowerCase();
    if (!msg.includes('duplicate') && !msg.includes('unique')) throw error;
  }
  throw new Error('Could not generate a unique room code. Please try again.');
}

// ── Player helpers ────────────────────────────────────────────────────────────

export async function createPlayer(roomId: string, playerName: string): Promise<PlayerRow> {
  const { data, error } = await supabase
    .from('players')
    .insert({ room_id: roomId, player_name: playerName.trim() })
    .select()
    .single();
  if (error) throw error;
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
  if (error) throw error;
}

export async function getRoomScores(roomId: string): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ScoreRow[];
}
