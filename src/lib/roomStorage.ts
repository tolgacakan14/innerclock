import type { RoomContext } from '../types';

const storageKey = (code: string) => `innerclock_room_player_${code.toUpperCase()}`;

export function saveRoomPlayer(ctx: RoomContext): void {
  localStorage.setItem(storageKey(ctx.roomCode), JSON.stringify(ctx));
}

export function loadRoomPlayer(roomCode: string): RoomContext | null {
  try {
    const raw = localStorage.getItem(storageKey(roomCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RoomContext;
    // Basic sanity check
    if (!parsed.roomId || !parsed.playerId || !parsed.playerName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRoomPlayer(roomCode: string): void {
  localStorage.removeItem(storageKey(roomCode));
}
