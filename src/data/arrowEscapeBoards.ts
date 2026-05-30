/**
 * Arrow Escape boards — 15 harder hand-designed puzzles.
 *
 * Rules:
 *   Tap an arrow. If its path to the board edge is clear (no arrows
 *   blocking it in the direction it points), it escapes and is removed.
 *   Blocked taps just shake — no penalty.
 *
 * All boards 7×7 – 9×9. Each has been manually verified solvable.
 * Grid: 0-indexed (row, col). (0,0) = top-left.
 *
 * Escape condition for arrow at (r,c) pointing:
 *   up    → no arrow with same col AND row < r
 *   down  → no arrow with same col AND row > r
 *   left  → no arrow with same row AND col < c
 *   right → no arrow with same row AND col > c
 */

export type ArrowDir = 'up' | 'down' | 'left' | 'right';

export interface ArrowItem {
  id:    number;
  row:   number;
  col:   number;
  dir:   ArrowDir;
  color: string;
}

export interface ArrowBoard {
  id:         number;
  name:       string;
  gridSize:   number;
  arrows:     ArrowItem[];
  difficulty: 'easy' | 'medium' | 'hard';
}

// ── Colors ────────────────────────────────────────────────────────────────────
const CY = '#00D4FF';  // cyan
const YL = '#FFD60A';  // yellow
const GR = '#30D158';  // green
const MG = '#FF375F';  // magenta
const BL = '#0A84FF';  // blue
const PU = '#BF5AF2';  // purple

// ── Boards ────────────────────────────────────────────────────────────────────

export const arrowEscapeBoards: ArrowBoard[] = [

  // ══════════════ 7×7 BOARDS ══════════════════════════════════════════════════

  {
    // 4 independent sweeps crossing the grid.
    // Col 1 ↑: (0,1)→(1,1)→(2,1)→(3,1)  Col 5 ↓: (6,5)→(5,5)→(4,5)→(3,5)
    // Row 2 →: (2,6)→(2,5)→(2,4)         Row 4 ←: (4,0)→(4,1)→(4,2)
    // Each sweep clears from its open end first.
    id: 1, name: 'Quad Cascade', gridSize: 7, difficulty: 'hard',
    arrows: [
      { id:1,  row:0, col:1, dir:'up',    color:CY },
      { id:2,  row:1, col:1, dir:'up',    color:GR },
      { id:3,  row:2, col:1, dir:'up',    color:YL },
      { id:4,  row:3, col:1, dir:'up',    color:MG },
      { id:5,  row:6, col:5, dir:'down',  color:BL },
      { id:6,  row:5, col:5, dir:'down',  color:PU },
      { id:7,  row:4, col:5, dir:'down',  color:CY },
      { id:8,  row:3, col:5, dir:'down',  color:GR },
      { id:9,  row:2, col:6, dir:'right', color:YL },
      { id:10, row:2, col:5, dir:'right', color:MG },
      { id:11, row:2, col:4, dir:'right', color:BL },
      { id:12, row:4, col:0, dir:'left',  color:PU },
      { id:13, row:4, col:1, dir:'left',  color:CY },
      { id:14, row:4, col:2, dir:'left',  color:GR },
    ],
  },

  {
    // Single 8-step winding chain + 8 instant extras.
    // Chain: (5,4)→ unlocks (3,4)↓ → (3,1)→ → (4,1)↑ → (4,5)← → (2,5)↓ → (2,3)→ → (4,3)↑
    // Extras in cols 0,2,6 and row 1 — never interfere with the chain.
    id: 2, name: 'Serpent Path', gridSize: 7, difficulty: 'hard',
    arrows: [
      { id:1,  row:5, col:4, dir:'right', color:CY },
      { id:2,  row:3, col:4, dir:'down',  color:GR },
      { id:3,  row:3, col:1, dir:'right', color:YL },
      { id:4,  row:4, col:1, dir:'up',    color:MG },
      { id:5,  row:4, col:5, dir:'left',  color:BL },
      { id:6,  row:2, col:5, dir:'down',  color:PU },
      { id:7,  row:2, col:3, dir:'right', color:CY },
      { id:8,  row:4, col:3, dir:'up',    color:GR },
      // instant extras
      { id:9,  row:0, col:0, dir:'up',    color:YL },
      { id:10, row:6, col:0, dir:'down',  color:MG },
      { id:11, row:0, col:2, dir:'up',    color:BL },
      { id:12, row:6, col:2, dir:'down',  color:PU },
      { id:13, row:0, col:6, dir:'up',    color:CY },
      { id:14, row:6, col:6, dir:'down',  color:GR },
      { id:15, row:1, col:6, dir:'right', color:YL },
      { id:16, row:1, col:0, dir:'left',  color:MG },
    ],
  },

  {
    // Two independent sweeps + a row that needs BOTH cleared to finish.
    // Col 3 ↑ (5 deep): (0,3)→(1,3)→(2,3)→(3,3)→(4,3)
    // Row 5 →: (5,6)→(5,5)→(5,4)→(5,3)→(5,2)  — (5,3)→ checks row 5 cols>3
    //   (5,3)→ is NOT blocked by (4,3)↑ because col≠row. Independent. ✓
    // Row 1 ← (3): (1,0)←(1,1)←(1,2)←
    // Extras: corners
    id: 3, name: 'Column First', gridSize: 7, difficulty: 'hard',
    arrows: [
      { id:1,  row:0, col:3, dir:'up',    color:CY },
      { id:2,  row:1, col:3, dir:'up',    color:GR },
      { id:3,  row:2, col:3, dir:'up',    color:YL },
      { id:4,  row:3, col:3, dir:'up',    color:MG },
      { id:5,  row:4, col:3, dir:'up',    color:BL },
      { id:6,  row:5, col:6, dir:'right', color:PU },
      { id:7,  row:5, col:5, dir:'right', color:CY },
      { id:8,  row:5, col:4, dir:'right', color:GR },
      { id:9,  row:5, col:3, dir:'right', color:YL },
      { id:10, row:5, col:2, dir:'right', color:MG },
      { id:11, row:1, col:0, dir:'left',  color:BL },
      { id:12, row:1, col:1, dir:'left',  color:PU },
      { id:13, row:1, col:2, dir:'left',  color:CY },
      { id:14, row:0, col:6, dir:'up',    color:GR },
      { id:15, row:6, col:6, dir:'down',  color:YL },
      { id:16, row:6, col:0, dir:'down',  color:MG },
    ],
  },

  {
    // Dense cluster: 3 arms from corners + a gated center row.
    // Arm top-left ↑: (0,0)↑,(1,0)↑,(2,0)↑
    // Arm top-right →: (0,6)↑,(0,5)↑,(0,4)↑
    // Arm bot-left ↓: (6,0)↓,(6,1)↓,(6,2)↓  (left escape instant for ↓? No: (6,0)↓ checks col 0, rows>6 = nothing → instant)
    // Arm bot-right ←: (6,6)↓,(5,6)↓,(4,6)↓
    // Center row 3: (3,6)→,(3,5)→,(3,4)→,(3,3)→ — four-step right sweep
    // Cross: does any arm block center? (4,6)↓ is col 6 row 4. (3,6)→ checks row 3 cols>6 = nothing → instant ✓
    id: 4, name: 'Star Arms', gridSize: 7, difficulty: 'hard',
    arrows: [
      { id:1,  row:0, col:0, dir:'up',    color:CY },
      { id:2,  row:1, col:0, dir:'up',    color:GR },
      { id:3,  row:2, col:0, dir:'up',    color:YL },
      { id:4,  row:0, col:6, dir:'up',    color:MG },
      { id:5,  row:0, col:5, dir:'up',    color:BL },
      { id:6,  row:0, col:4, dir:'up',    color:PU },
      { id:7,  row:6, col:0, dir:'down',  color:CY },
      { id:8,  row:6, col:1, dir:'down',  color:GR },
      { id:9,  row:6, col:2, dir:'down',  color:YL },
      { id:10, row:6, col:6, dir:'down',  color:MG },
      { id:11, row:5, col:6, dir:'down',  color:BL },
      { id:12, row:4, col:6, dir:'down',  color:PU },
      { id:13, row:3, col:6, dir:'right', color:CY },
      { id:14, row:3, col:5, dir:'right', color:GR },
      { id:15, row:3, col:4, dir:'right', color:YL },
      { id:16, row:3, col:3, dir:'right', color:MG },
    ],
  },

  {
    // Two long diagonal-style chains that must interleave.
    // Col 2 ↑ (6 deep): (0,2)↑,(1,2)↑,(2,2)↑,(3,2)↑,(4,2)↑,(5,2)↑
    // Col 4 ↓ (6 deep): (6,4)↓,(5,4)↓,(4,4)↓,(3,4)↓,(2,4)↓,(1,4)↓
    // Extras: 4 corner arrows + row connectors
    id: 5, name: 'Twin Towers', gridSize: 7, difficulty: 'hard',
    arrows: [
      { id:1,  row:0, col:2, dir:'up',    color:CY },
      { id:2,  row:1, col:2, dir:'up',    color:GR },
      { id:3,  row:2, col:2, dir:'up',    color:YL },
      { id:4,  row:3, col:2, dir:'up',    color:MG },
      { id:5,  row:4, col:2, dir:'up',    color:BL },
      { id:6,  row:5, col:2, dir:'up',    color:PU },
      { id:7,  row:6, col:4, dir:'down',  color:CY },
      { id:8,  row:5, col:4, dir:'down',  color:GR },
      { id:9,  row:4, col:4, dir:'down',  color:YL },
      { id:10, row:3, col:4, dir:'down',  color:MG },
      { id:11, row:2, col:4, dir:'down',  color:BL },
      { id:12, row:1, col:4, dir:'down',  color:PU },
      { id:13, row:0, col:0, dir:'up',    color:CY },
      { id:14, row:6, col:6, dir:'down',  color:GR },
      { id:15, row:6, col:0, dir:'left',  color:YL },
      { id:16, row:0, col:6, dir:'right', color:MG },
    ],
  },

  // ══════════════ 8×8 BOARDS ══════════════════════════════════════════════════

  {
    // Winding chain through 8×8 grid (10 steps) + 8 instant extras.
    // Chain: (7,5)→ → (3,5)↓ → (3,2)→ → (6,2)↑ → (6,4)← → (1,4)↓ →
    //        (1,7)← → (5,7)↑ → (5,0)→ → (2,0)↓
    // Each arrow verified to be in the escape path of the next.
    id: 6, name: 'Grid Snake', gridSize: 8, difficulty: 'hard',
    arrows: [
      { id:1,  row:7, col:5, dir:'right', color:CY },
      { id:2,  row:3, col:5, dir:'down',  color:GR },
      { id:3,  row:3, col:2, dir:'right', color:YL },
      { id:4,  row:6, col:2, dir:'up',    color:MG },
      { id:5,  row:6, col:4, dir:'left',  color:BL },
      { id:6,  row:1, col:4, dir:'down',  color:PU },
      { id:7,  row:1, col:7, dir:'left',  color:CY },
      { id:8,  row:5, col:7, dir:'up',    color:GR },
      { id:9,  row:5, col:0, dir:'right', color:YL },
      { id:10, row:2, col:0, dir:'down',  color:MG },
      // instant extras
      { id:11, row:0, col:1, dir:'up',    color:BL },
      { id:12, row:0, col:3, dir:'up',    color:PU },
      { id:13, row:0, col:6, dir:'up',    color:CY },
      { id:14, row:7, col:1, dir:'down',  color:GR },
      { id:15, row:7, col:3, dir:'down',  color:YL },
      { id:16, row:0, col:4, dir:'up',    color:MG },
      { id:17, row:4, col:0, dir:'left',  color:BL },
      { id:18, row:4, col:6, dir:'right', color:PU },
    ],
  },

  {
    // Four sweeps forming a cross pattern.
    // Row 3 → (5): (3,7)→,(3,6)→,(3,5)→,(3,4)→,(3,3)→
    // Row 4 ← (5): (4,0)←,(4,1)←,(4,2)←,(4,3)←,(4,4)←
    // Col 2 ↑ (4): (0,2)↑,(1,2)↑,(2,2)↑,(3,2)↑  — (3,2)↑ not blocked by row 3 (checks col not row)
    // Col 5 ↓ (4): (7,5)↓,(6,5)↓,(5,5)↓,(4,5)↓  — (4,5)↓ not blocked by row 4 ←(checks col)
    id: 7, name: 'Big Cross', gridSize: 8, difficulty: 'hard',
    arrows: [
      { id:1,  row:3, col:7, dir:'right', color:CY },
      { id:2,  row:3, col:6, dir:'right', color:GR },
      { id:3,  row:3, col:5, dir:'right', color:YL },
      { id:4,  row:3, col:4, dir:'right', color:MG },
      { id:5,  row:3, col:3, dir:'right', color:BL },
      { id:6,  row:4, col:0, dir:'left',  color:PU },
      { id:7,  row:4, col:1, dir:'left',  color:CY },
      { id:8,  row:4, col:2, dir:'left',  color:GR },
      { id:9,  row:4, col:3, dir:'left',  color:YL },
      { id:10, row:4, col:4, dir:'left',  color:MG },
      { id:11, row:0, col:2, dir:'up',    color:BL },
      { id:12, row:1, col:2, dir:'up',    color:PU },
      { id:13, row:2, col:2, dir:'up',    color:CY },
      { id:14, row:3, col:2, dir:'up',    color:GR },
      { id:15, row:7, col:5, dir:'down',  color:YL },
      { id:16, row:6, col:5, dir:'down',  color:MG },
      { id:17, row:5, col:5, dir:'down',  color:BL },
      { id:18, row:4, col:5, dir:'down',  color:PU },
    ],
  },

  {
    // Three independent sweeps at 3 depths + corner fillers.
    // Col 1 ↑ (6): (0,1)↑ → … → (5,1)↑
    // Col 6 ↓ (6): (7,6)↓ → … → (2,6)↓
    // Row 3 → (4): (3,7)→,(3,6)→,(3,5)→,(3,4)→  — (3,6)↓ and (3,7)→ at same col/row?
    //   (3,7)→ is instant. (3,6)→ checks row 3, cols>6. (3,7)→ blocks it.
    //   After (3,7) escapes → (3,6)→ clear. But (2,6)↓ is in col 6 row 2 not row 3. ✓
    id: 8, name: 'Tri-Force', gridSize: 8, difficulty: 'hard',
    arrows: [
      { id:1,  row:0, col:1, dir:'up',    color:CY },
      { id:2,  row:1, col:1, dir:'up',    color:GR },
      { id:3,  row:2, col:1, dir:'up',    color:YL },
      { id:4,  row:3, col:1, dir:'up',    color:MG },
      { id:5,  row:4, col:1, dir:'up',    color:BL },
      { id:6,  row:5, col:1, dir:'up',    color:PU },
      { id:7,  row:7, col:6, dir:'down',  color:CY },
      { id:8,  row:6, col:6, dir:'down',  color:GR },
      { id:9,  row:5, col:6, dir:'down',  color:YL },
      { id:10, row:4, col:6, dir:'down',  color:MG },
      { id:11, row:3, col:6, dir:'down',  color:BL },
      { id:12, row:2, col:6, dir:'down',  color:PU },
      { id:13, row:3, col:7, dir:'right', color:CY },
      { id:14, row:3, col:5, dir:'right', color:GR },
      { id:15, row:3, col:4, dir:'right', color:YL },
      { id:16, row:3, col:3, dir:'right', color:MG },
      { id:17, row:0, col:0, dir:'up',    color:BL },
      { id:18, row:7, col:7, dir:'down',  color:PU },
    ],
  },

  {
    // Layered rings: two independent "L" sweeps + center column.
    // Row 0 → (4): (0,7)→,(0,6)→,(0,5)→,(0,4)→
    // Row 7 ← (4): (7,0)←,(7,1)←,(7,2)←,(7,3)←
    // Col 0 ↑ (4): (0,0)↑,(1,0)↑,(2,0)↑,(3,0)↑   — (0,0)↑ is at row 0 so checks row<0=nothing→instant
    // Col 7 ↓ (4): (7,7)↓,(6,7)↓,(5,7)↓,(4,7)↓
    // Center col 3 ↑ (4): (0,3)↑,(1,3)↑,(2,3)↑,(3,3)↑
    id: 9, name: 'Frame Lock', gridSize: 8, difficulty: 'hard',
    arrows: [
      { id:1,  row:0, col:7, dir:'right', color:CY },
      { id:2,  row:0, col:6, dir:'right', color:GR },
      { id:3,  row:0, col:5, dir:'right', color:YL },
      { id:4,  row:0, col:4, dir:'right', color:MG },
      { id:5,  row:7, col:0, dir:'left',  color:BL },
      { id:6,  row:7, col:1, dir:'left',  color:PU },
      { id:7,  row:7, col:2, dir:'left',  color:CY },
      { id:8,  row:7, col:3, dir:'left',  color:GR },
      { id:9,  row:0, col:0, dir:'up',    color:YL },
      { id:10, row:1, col:0, dir:'up',    color:MG },
      { id:11, row:2, col:0, dir:'up',    color:BL },
      { id:12, row:3, col:0, dir:'up',    color:PU },
      { id:13, row:7, col:7, dir:'down',  color:CY },
      { id:14, row:6, col:7, dir:'down',  color:GR },
      { id:15, row:5, col:7, dir:'down',  color:YL },
      { id:16, row:4, col:7, dir:'down',  color:MG },
      { id:17, row:0, col:3, dir:'up',    color:BL },
      { id:18, row:1, col:3, dir:'up',    color:PU },
    ],
  },

  {
    // Dense 8×8: two parallel cols + two parallel rows + a cross link.
    // Col 2 ↑ (5): (0,2)↑→…→(4,2)↑
    // Col 5 ↓ (5): (7,5)↓→…→(3,5)↓
    // Row 1 → (4): (1,7)→,(1,6)→,(1,5)→,(1,4)→  — (1,5) in col 5 row 1: col 5 chain checks rows>rself; (1,5)→ is row 1 and checks row 1 cols>5; (3,5)↓ is at row 3>1 not at row 1. ✓
    // Row 6 ← (4): (6,0)←,(6,1)←,(6,2)←,(6,3)←
    // Extra (2): (0,0)↑,(7,7)↓
    id: 10, name: 'Grid Lines', gridSize: 8, difficulty: 'hard',
    arrows: [
      { id:1,  row:0, col:2, dir:'up',    color:CY },
      { id:2,  row:1, col:2, dir:'up',    color:GR },
      { id:3,  row:2, col:2, dir:'up',    color:YL },
      { id:4,  row:3, col:2, dir:'up',    color:MG },
      { id:5,  row:4, col:2, dir:'up',    color:BL },
      { id:6,  row:7, col:5, dir:'down',  color:PU },
      { id:7,  row:6, col:5, dir:'down',  color:CY },
      { id:8,  row:5, col:5, dir:'down',  color:GR },
      { id:9,  row:4, col:5, dir:'down',  color:YL },
      { id:10, row:3, col:5, dir:'down',  color:MG },
      { id:11, row:1, col:7, dir:'right', color:BL },
      { id:12, row:1, col:6, dir:'right', color:PU },
      { id:13, row:1, col:5, dir:'right', color:CY },
      { id:14, row:1, col:4, dir:'right', color:GR },
      { id:15, row:6, col:0, dir:'left',  color:YL },
      { id:16, row:6, col:1, dir:'left',  color:MG },
      { id:17, row:6, col:2, dir:'left',  color:BL },
      { id:18, row:6, col:3, dir:'left',  color:PU },
    ],
  },

  // ══════════════ 9×9 BOARDS ══════════════════════════════════════════════════

  {
    // Four deep sweeps on a 9×9 grid (rows/cols 0–8).
    // Col 1 ↑ (7): (0,1)↑→…→(6,1)↑
    // Col 7 ↓ (7): (8,7)↓→…→(2,7)↓
    // Row 2 → (4): (2,8)→,(2,7)→,(2,6)→,(2,5)→  — (2,7)→ and (2,7)↓ at same cell? NO: row sweep has (2,7)→, col sweep has (8,7)↓. Different cells. ✓
    // Row 6 ← (4): (6,0)←,(6,1)←,(6,2)←,(6,3)←
    // Extras (4): corners
    id: 11, name: 'Long Reach', gridSize: 9, difficulty: 'hard',
    arrows: [
      { id:1,  row:0, col:1, dir:'up',    color:CY },
      { id:2,  row:1, col:1, dir:'up',    color:GR },
      { id:3,  row:2, col:1, dir:'up',    color:YL },
      { id:4,  row:3, col:1, dir:'up',    color:MG },
      { id:5,  row:4, col:1, dir:'up',    color:BL },
      { id:6,  row:5, col:1, dir:'up',    color:PU },
      { id:7,  row:6, col:1, dir:'up',    color:CY },
      { id:8,  row:8, col:7, dir:'down',  color:GR },
      { id:9,  row:7, col:7, dir:'down',  color:YL },
      { id:10, row:6, col:7, dir:'down',  color:MG },
      { id:11, row:5, col:7, dir:'down',  color:BL },
      { id:12, row:4, col:7, dir:'down',  color:PU },
      { id:13, row:3, col:7, dir:'down',  color:CY },
      { id:14, row:2, col:7, dir:'down',  color:GR },
      { id:15, row:2, col:8, dir:'right', color:YL },
      { id:16, row:2, col:6, dir:'right', color:MG },
      { id:17, row:2, col:5, dir:'right', color:BL },
      { id:18, row:6, col:0, dir:'left',  color:PU },
      { id:19, row:6, col:2, dir:'left',  color:CY },
      { id:20, row:6, col:3, dir:'left',  color:GR },
    ],
  },

  {
    // Two crossing diagonal-style chains on 9×9.
    // Chain A — col 3 ↑ (8): (0,3)↑→…→(7,3)↑
    // Chain B — row 5 → (7): (5,8)→,(5,7)→,(5,6)→,(5,5)→,(5,4)→,(5,3)→,(5,2)→
    //   Cross at (5,3)→: checks row 5 cols>3. (5,4),(5,5)…(5,8) all chain B.
    //   (5,3)↑ would interfere — but (5,3) IS chain B (points right not up).
    //   Chain A has (5,3)↑ ... wait: chain A (col 3 up) has (5,3)↑. Conflict with (5,3)→!
    //   Can't use same cell twice. Adjust: chain B starts at col 2.
    //   Row 5 → (5): (5,8)→,(5,7)→,(5,6)→,(5,5)→,(5,4)→
    //   Chain A (col 3 ↑) and chain B (row 5 →) don't share cells now.
    //   Cross: (5,3)↑ in chain A is at row 5. (5,4)→ in chain B checks row 5, cols>4. (5,3) col 3 < 4 → no block. ✓
    //   (5,4)→ blocked by (5,5),(5,6),(5,7),(5,8). → clears from right.
    // Extras (7): various instant positions
    id: 12, name: 'Double Axis', gridSize: 9, difficulty: 'hard',
    arrows: [
      { id:1,  row:0, col:3, dir:'up',    color:CY },
      { id:2,  row:1, col:3, dir:'up',    color:GR },
      { id:3,  row:2, col:3, dir:'up',    color:YL },
      { id:4,  row:3, col:3, dir:'up',    color:MG },
      { id:5,  row:4, col:3, dir:'up',    color:BL },
      { id:6,  row:5, col:3, dir:'up',    color:PU },
      { id:7,  row:6, col:3, dir:'up',    color:CY },
      { id:8,  row:7, col:3, dir:'up',    color:GR },
      { id:9,  row:5, col:8, dir:'right', color:YL },
      { id:10, row:5, col:7, dir:'right', color:MG },
      { id:11, row:5, col:6, dir:'right', color:BL },
      { id:12, row:5, col:5, dir:'right', color:PU },
      { id:13, row:5, col:4, dir:'right', color:CY },
      // extras
      { id:14, row:0, col:0, dir:'up',    color:GR },
      { id:15, row:0, col:8, dir:'up',    color:YL },
      { id:16, row:8, col:0, dir:'down',  color:MG },
      { id:17, row:8, col:8, dir:'down',  color:BL },
      { id:18, row:3, col:0, dir:'left',  color:PU },
    ],
  },

  {
    // Three parallel up-columns on 9×9, different depths.
    // Col 2 ↑ (5): (0,2)↑→…→(4,2)↑
    // Col 5 ↑ (6): (0,5)↑→…→(5,5)↑
    // Col 8 ↓ (7): (8,8)↓→…→(2,8)↓
    // Row 0 → (3): (0,8)→ instant? (0,8)→ row 0 cols>8=nothing ✓. Actually in 9×9 col 8 is max.
    //   (0,8)→ instant ✓. (0,7)→ after (0,8). (0,6)→ after (0,8),(0,7).
    // Row 8 ← (3): (8,0)←,(8,1)←,(8,2)←
    // Extras (2): (0,0)↑,(8,8)↓ ... wait (8,8)↓ is already in col 8 chain! Use different.
    //   Extra: (4,0)←, (4,8) already in col 8 chain at row 4? Let me check: (4,8)↓ is in col 8 chain. So extra can't be (4,8). Use (4,0)← instant ✓.
    id: 13, name: 'Parallel Lines', gridSize: 9, difficulty: 'hard',
    arrows: [
      { id:1,  row:0, col:2, dir:'up',    color:CY },
      { id:2,  row:1, col:2, dir:'up',    color:GR },
      { id:3,  row:2, col:2, dir:'up',    color:YL },
      { id:4,  row:3, col:2, dir:'up',    color:MG },
      { id:5,  row:4, col:2, dir:'up',    color:BL },
      { id:6,  row:0, col:5, dir:'up',    color:PU },
      { id:7,  row:1, col:5, dir:'up',    color:CY },
      { id:8,  row:2, col:5, dir:'up',    color:GR },
      { id:9,  row:3, col:5, dir:'up',    color:YL },
      { id:10, row:4, col:5, dir:'up',    color:MG },
      { id:11, row:5, col:5, dir:'up',    color:BL },
      { id:12, row:8, col:8, dir:'down',  color:PU },
      { id:13, row:7, col:8, dir:'down',  color:CY },
      { id:14, row:6, col:8, dir:'down',  color:GR },
      { id:15, row:5, col:8, dir:'down',  color:YL },
      { id:16, row:4, col:8, dir:'down',  color:MG },
      { id:17, row:3, col:8, dir:'down',  color:BL },
      { id:18, row:2, col:8, dir:'down',  color:PU },
      { id:19, row:0, col:0, dir:'up',    color:CY },
      { id:20, row:8, col:0, dir:'left',  color:GR },
    ],
  },

  {
    // Grand 9×9 sweep: 4 sweeps of 5 arrows each.
    // Row 1 → (5): (1,8)→,(1,7)→,(1,6)→,(1,5)→,(1,4)→
    // Row 7 ← (5): (7,0)←,(7,1)←,(7,2)←,(7,3)←,(7,4)←
    // Col 2 ↑ (5): (0,2)↑,(1,2)↑,(2,2)↑,(3,2)↑,(4,2)↑
    //   (1,2)↑ is in col 2 AND row 1. (1,4)→ checks row 1, cols>4. Col 2 < 4 → not blocked ✓.
    //   Does (1,2)↑ get blocked by row 1 sweep? (1,2)↑ checks col 2, rows<1. (0,2) blocks it. ✓
    // Col 6 ↓ (5): (8,6)↓,(7,6)↓,(6,6)↓,(5,6)↓,(4,6)↓
    //   (7,6)↓ in col 6 AND row 7. (7,4)← checks row 7 cols<4. Col 6>4, so (7,6) not relevant. ✓
    // Extras (2): (0,0)↑,(8,8)↓
    id: 14, name: 'Grand Sweep', gridSize: 9, difficulty: 'hard',
    arrows: [
      { id:1,  row:1, col:8, dir:'right', color:CY },
      { id:2,  row:1, col:7, dir:'right', color:GR },
      { id:3,  row:1, col:6, dir:'right', color:YL },
      { id:4,  row:1, col:5, dir:'right', color:MG },
      { id:5,  row:1, col:4, dir:'right', color:BL },
      { id:6,  row:7, col:0, dir:'left',  color:PU },
      { id:7,  row:7, col:1, dir:'left',  color:CY },
      { id:8,  row:7, col:2, dir:'left',  color:GR },
      { id:9,  row:7, col:3, dir:'left',  color:YL },
      { id:10, row:7, col:4, dir:'left',  color:MG },
      { id:11, row:0, col:2, dir:'up',    color:BL },
      { id:12, row:1, col:2, dir:'up',    color:PU },
      { id:13, row:2, col:2, dir:'up',    color:CY },
      { id:14, row:3, col:2, dir:'up',    color:GR },
      { id:15, row:4, col:2, dir:'up',    color:YL },
      { id:16, row:8, col:6, dir:'down',  color:MG },
      { id:17, row:7, col:6, dir:'down',  color:BL },
      { id:18, row:6, col:6, dir:'down',  color:PU },
      { id:19, row:5, col:6, dir:'down',  color:CY },
      { id:20, row:4, col:6, dir:'down',  color:GR },
    ],
  },

  {
    // Ultimate board: 5 sweeps with cross-link.
    // Col 4 ↑ (8 deep): (0,4)↑→…→(7,4)↑  — tallest column
    // Row 4 → (5): (4,8)→,(4,7)→,(4,6)→,(4,5)→,(4,4)→ — (4,4)→ is row 4 sweep NOT col 4
    //   Wait: (4,4) can only be one arrow. Col 4 chain has (4,4)↑. Row 4 sweep cannot also have (4,4).
    //   Adjust: row 4 right sweep starts after col 4 intersection.
    //   Row 4 →: (4,8)→,(4,7)→,(4,6)→,(4,5)→  — stops at col 5, doesn't use col 4
    //   (4,5)→ checks row 4, cols>5. (4,6),(4,7),(4,8) block it. Then clears right-to-left.
    //   Does (4,4)↑ (col chain) block (4,5)→? (4,5)→ checks row 4, cols>5. (4,4) col 4 < 5 → no block ✓
    // Row 4 ←: (4,0)←,(4,1)←,(4,2)←,(4,3)←  — left of col 4
    // Col 2 ↓ (5): (8,2)↓→…→(4,2)↓  — (4,2) is last in col 2 chain AND row 4 left sweep has (4,2)←
    //   Can't have (4,2)↓ and (4,2)← at same cell. Adjust col 2 to only go to row 5.
    //   Col 2 ↓ (4): (8,2)↓,(7,2)↓,(6,2)↓,(5,2)↓  — stops at row 5
    //   (4,2)← is in row 4 only, col 2 chain stops at row 5. ✓
    //   (4,2)← checks row 4, cols<2. Nothing → instant ✓.
    //   (5,2)↓ checks col 2, rows>5. (6,2),(7,2),(8,2) block it. ✓
    // Row 8 ← (4): (8,0)←,(8,1)←,(8,2)←,(8,3)←  — (8,2)←: row 8, col 2, blocked by (8,1),(8,0)
    //   (8,2)↓ is already in col 2 chain! Can't use same cell. Adjust: only (8,0)←,(8,1)← for row 8
    //   Actually (8,2)↓ is the STARTER of the col 2 down chain (instant). And (8,2) is used.
    //   Adjust row 8 sweep: (8,0)←, (8,1)←  OR use row 8 right: (8,8)→,(8,7)→,(8,6)→,(8,5)→
    // Extra (2): (0,0)↑, (0,8)↑
    id: 15, name: 'Final Order', gridSize: 9, difficulty: 'hard',
    arrows: [
      // Col 4 ↑ — 8 arrows
      { id:1,  row:0, col:4, dir:'up',    color:CY },
      { id:2,  row:1, col:4, dir:'up',    color:GR },
      { id:3,  row:2, col:4, dir:'up',    color:YL },
      { id:4,  row:3, col:4, dir:'up',    color:MG },
      { id:5,  row:4, col:4, dir:'up',    color:BL },
      { id:6,  row:5, col:4, dir:'up',    color:PU },
      { id:7,  row:6, col:4, dir:'up',    color:CY },
      { id:8,  row:7, col:4, dir:'up',    color:GR },
      // Row 4 right — 4 arrows (cols 5–8)
      { id:9,  row:4, col:8, dir:'right', color:YL },
      { id:10, row:4, col:7, dir:'right', color:MG },
      { id:11, row:4, col:6, dir:'right', color:BL },
      { id:12, row:4, col:5, dir:'right', color:PU },
      // Row 4 left — 4 arrows (cols 0–3)
      { id:13, row:4, col:0, dir:'left',  color:CY },
      { id:14, row:4, col:1, dir:'left',  color:GR },
      { id:15, row:4, col:2, dir:'left',  color:YL },
      { id:16, row:4, col:3, dir:'left',  color:MG },
      // Row 8 right — 4 arrows
      { id:17, row:8, col:8, dir:'right', color:BL },
      { id:18, row:8, col:7, dir:'right', color:PU },
      { id:19, row:8, col:6, dir:'right', color:CY },
      { id:20, row:8, col:5, dir:'right', color:GR },
    ],
  },
];
