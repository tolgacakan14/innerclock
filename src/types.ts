export type ShapeName = 'circle' | 'square' | 'triangle' | 'diamond' | 'ring' | 'blob';

// ── Room / multiplayer ────────────────────────────────────────────────────────
export interface RoomContext {
  roomId:     string;
  roomCode:   string;
  roomName:   string;
  playerId:   string;
  playerName: string;
}

export type GameMode = 'time' | 'color' | 'rush' | 'golf' | 'grandma' | 'arrowEscape';

// ── Time mode ────────────────────────────────────────────────────────────────
export interface Round {
  target: number;  // seconds — hidden until feedback
  actual: number;  // seconds — measured via performance.now()
  error:  number;  // Math.abs(target - actual)
  score:  number;  // 0–100 per round (5 rounds × 100 = 500 max)
}

// ── Color mode ───────────────────────────────────────────────────────────────
export interface TargetColor {
  h: number;  // hue 0–360
  s: number;  // saturation 0–100
  l: number;  // lightness 0–100
}

export interface ColorRound {
  target:   TargetColor;
  selected: TargetColor;
  deltaE:   number;  // CIEDE2000 perceptual color difference
  score:    number;  // 0–100 per round (5 rounds × 100 = 500 max)
}

// ── Golf mode ─────────────────────────────────────────────────────────────────
export interface GolfWall {
  x1: number; y1: number;
  x2: number; y2: number;
}

export interface GolfCourse {
  id:        number;
  name:      string;
  par:       number;
  ballStart: { x: number; y: number };
  hole:      { x: number; y: number };
  walls:     GolfWall[];
}

export interface GolfRoundResult {
  courseId:   number;
  courseName: string;
  par:        number;
  shots:      number;
}

// ── Grandma Walking mode ──────────────────────────────────────────────────────
export interface GrandmaRoundResult {
  patternId:   number;
  patternName: string;
  score:       number;   // floor(seconds survived)
}

// ── Arrow Escape mode ─────────────────────────────────────────────────────────
export interface ArrowEscapeRoundResult {
  boardId:     number;
  boardName:   string;
  solveTime:   number;   // seconds — lower is better
  mistakes:    number;   // blocked attempts
  totalArrows: number;
}
