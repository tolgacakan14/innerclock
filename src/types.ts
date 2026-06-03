export type ShapeName = 'circle' | 'square' | 'triangle' | 'diamond' | 'ring' | 'blob';

// ── Daily Challenge ───────────────────────────────────────────────────────────

/**
 * Passed to each game wrapper when it is running inside the Daily Challenge.
 * The wrapper uses this to skip intro screens and report its final score back
 * to the orchestrator instead of showing a standalone results screen.
 */
export interface DailyContext {
  /** 0-based index of the current game within the 5-game run. */
  gameIndex:  number;
  /** Total games in the challenge (always 5). */
  totalGames: number;
  /** Called when the game produces a final score. */
  onComplete: (rawScore: number, label: string, lowerIsBetter: boolean) => void;
  /** Called if the player quits mid-challenge (taps ← Home during a game). */
  onAbort:    () => void;
}

// ── Room / multiplayer ────────────────────────────────────────────────────────
export interface RoomContext {
  roomId:     string;
  roomCode:   string;
  roomName:   string;
  playerId:   string;
  playerName: string;
  /** True when this player created the room. Persisted in localStorage as fallback. */
  isHost?:      boolean;
  /** Set when playing inside a party round — not persisted to localStorage. */
  roundId?:     string;
  roundNumber?: number;
}

export type GameMode = 'time' | 'color' | 'rush' | 'golf' | 'grandma' | 'arrowEscape' | 'sequence' | 'memory' | 'timing';

// ── Sequence Tap mode ─────────────────────────────────────────────────────────
export interface SequenceTapResult {
  completedLevels:   number;
  maxSequenceLength: number;
  score:             number;
}

// ── Memory Grid mode ──────────────────────────────────────────────────────────
export interface MemoryGridResult {
  completedRounds:   number;
  totalCorrectCells: number;
  score:             number;
}

// ── Tap Timing mode ───────────────────────────────────────────────────────────
export interface TapTimingResult {
  perfects: number;
  goods:    number;
  misses:   number;
  maxCombo: number;
  score:    number;
}

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
  patternId:      number;
  patternName:    string;
  score:          number;   // floor(seconds survived)
  diedAtLevelName?: string; // e.g. 'Last Dance', 'Virgin Mode'
}

// ── Arrow Escape mode ─────────────────────────────────────────────────────────
export interface ArrowEscapeRoundResult {
  boardId:     number;
  boardName:   string;
  solveTime:   number;   // seconds — lower is better
  mistakes:    number;   // blocked attempts
  totalArrows: number;
}
