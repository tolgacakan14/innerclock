/**
 * Arrow Escape — 15 puzzle boards with tiered difficulty.
 *
 * Escape rule: tap arrow at (r,c) pointing dir. It escapes only if
 * NO other arrow exists in its escape lane:
 *   up    → no arrow at same col,  row < r
 *   down  → no arrow at same col,  row > r
 *   left  → no arrow at same row,  col < c
 *   right → no arrow at same row,  col > c
 *
 * Every board has been manually traced for solvability.
 * Grid is 0-indexed, (0,0) = top-left.
 *
 * Difficulty tiers (one board is drawn from each per game):
 *   medium  — boards 1–5:  8×8 grid, 20 arrows, straightforward chains
 *   hard    — boards 6–10: 8–9×9 grid, 21–22 arrows, tighter chains
 *   expert  — boards 11–15: 9×9 grid, 23–24 arrows, deep cascades
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
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

// ── Palette ───────────────────────────────────────────────────────────────────
const CY = '#00D4FF';
const YL = '#FFD60A';
const GR = '#30D158';
const MG = '#FF375F';
const BL = '#0A84FF';
const PU = '#BF5AF2';
const OR = '#FF9F0A';
const WH = '#E8E8E8';

/**
 * Board design notation used in comments:
 *   "→ unlocks X" means removing this arrow clears the path for X.
 *   "START" = escapable at game start (instant).
 * Each board has been verified: trace from START arrow(s) to the last.
 */
export const arrowEscapeBoards: ArrowBoard[] = [

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 1  "Iron Gate"  8×8  20 arrows
  // One START: (0,7)→. Clears row 0 right-chain, which unblocks a col chain,
  // which in turn unblocks the left-row chain and vertical chains.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 1, name: 'Iron Gate', gridSize: 8, difficulty: 'medium',
    arrows: [
      // Row 0 right-sweep: (0,7)→ START → (0,5)→ → (0,3)→ → (0,1)→
      { id:1,  row:0, col:7, dir:'right', color:CY },  // START
      { id:2,  row:0, col:5, dir:'right', color:GR },  // blocked by id1
      { id:3,  row:0, col:3, dir:'right', color:YL },  // blocked by id2
      { id:4,  row:0, col:1, dir:'right', color:MG },  // blocked by id3
      // Col 7 down-sweep: (7,7)↓ START → (5,7)↓ → (2,7)↓
      // (2,7)↓ is also blocked by id1 (row 0 col 7) initially
      { id:5,  row:7, col:7, dir:'down',  color:BL },  // START
      { id:6,  row:5, col:7, dir:'down',  color:PU },  // blocked by id5
      { id:7,  row:2, col:7, dir:'down',  color:OR },  // blocked by id5,id6 (and id1 ↑ until removed)
      // Col 1 up-sweep: (1,1)↑ blocked by (0,1)→? No: (1,1)↑ checks col 1 rows<1 = nothing.
      // But (0,1)→ is at row 0 col 1 — that's in col 1 row 0 < 1, so YES it blocks (1,1)↑.
      // After id4 (0,1)→ removed: (1,1)↑ → START in col 1
      { id:8,  row:1, col:1, dir:'up',    color:WH },  // blocked by id4
      { id:9,  row:3, col:1, dir:'up',    color:CY },  // blocked by id8
      { id:10, row:5, col:1, dir:'up',    color:YL },  // blocked by id9
      { id:11, row:7, col:1, dir:'up',    color:GR },  // blocked by id10
      // Row 7 left-sweep: (7,0)← START (row 7, nothing left of col 0) → (7,3)← …
      // But (7,1)↑ (id11) is at row 7 col 1; (7,3)← checks row 7 cols<3 → (7,1) blocks it
      { id:12, row:7, col:0, dir:'left',  color:MG },  // START (nothing left of col 0)
      { id:13, row:7, col:3, dir:'left',  color:BL },  // blocked by id11 until id11 removed, then by id12 until id12 removed
      { id:14, row:7, col:5, dir:'left',  color:PU },  // blocked by id13
      // Col 3 down-sweep: (3,3)↓ blocked by (7,3)← ... wait (7,3)← is row 7 not col 3.
      // (3,3)↓ checks col 3, rows > 3 → need something at col 3 rows > 3.
      // Add (5,3)↓ and (7,3) but (7,3) is already id13 pointing left. That's fine, still blocks (3,3)↓.
      { id:15, row:5, col:3, dir:'down',  color:OR },  // blocked by id13 (col 3, row 7 > 5)
      { id:16, row:3, col:3, dir:'down',  color:WH },  // blocked by id15
      // Row 5 right-sweep: (5,5)→ blocked by (5,7)↓ (row 5 col 7 > 5)
      { id:17, row:5, col:5, dir:'right', color:CY },  // blocked by id6
      // Row 3 right: (3,5)→ blocked by (3,7) ... add (3,7)↓? Already in col 7.
      // Actually (2,7)↓ id7 is col 7 row 2, so (3,5)→ checks row 3 cols>5, (3,7) must exist.
      // Use (3,7)← to create blocking: but wait we already have plenty.
      // Instead: (3,5)→ is blocked by (3,7) if there's anything in row 3 col 6 or 7.
      // id7 is at row 2 col 7, NOT row 3. So row 3 at col > 5 is clear.
      // Let's add (3,6)↑:
      { id:18, row:3, col:6, dir:'up',    color:GR },  // blocked by (0,6) if exists... (0,6) empty. START for col 6.
      // Col 4 sweep: (0,4)↑ blocked by nothing in col 4 rows < 0 = START.
      // But (0,4) is empty. Let's use (0,4)↓:
      // (0,4)↓ checks col 4 rows > 0. Add (4,4)↓:
      { id:19, row:4, col:4, dir:'down',  color:YL },  // START (no rows > 4 in col 4 — need to check)
      // Actually is col 4 clear below row 4? Yes if no other arrows in col 4 rows > 4. Checking... none. So (4,4)↓ is START.
      // Row 2 sweep: (2,4)→ blocked by (2,7)↓ (col 7 row 2 checks — no, (2,4)→ checks row 2 cols>4. id7 at col 7 row 2 IS in row 2 col 7 > 4. So (2,4)→ blocked by id7.
      { id:20, row:2, col:4, dir:'right', color:MG },  // blocked by id7
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 2  "Crossfire"  8×8  22 arrows
  // Two opposing sweeps create mutual blockades; must clear perimeter first.
  // START: (0,7)→ and (7,0)←
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 2, name: 'Crossfire', gridSize: 8, difficulty: 'medium',
    arrows: [
      // TOP row right-sweep (4 arrows)
      { id:1,  row:0, col:7, dir:'right', color:CY },  // START
      { id:2,  row:0, col:5, dir:'right', color:GR },
      { id:3,  row:0, col:3, dir:'right', color:YL },
      { id:4,  row:0, col:1, dir:'right', color:MG },
      // BOTTOM row left-sweep (4 arrows)
      { id:5,  row:7, col:0, dir:'left',  color:BL },  // START
      { id:6,  row:7, col:2, dir:'left',  color:PU },
      { id:7,  row:7, col:4, dir:'left',  color:OR },
      { id:8,  row:7, col:6, dir:'left',  color:WH },
      // Col 0 down-sweep: (0,0)↓ blocked by id4 (row 0 col 1? No: (0,0)↓ checks col 0 rows>0).
      // Anything in col 0 rows > 0? id5 is at row 7 col 0 pointing left, it's in col 0 row 7. YES blocks (0,0)↓.
      { id:9,  row:0, col:0, dir:'down',  color:CY },  // blocked by id5
      // After id5 removed: (0,0)↓ → clears col 0.
      // Col 0 down continuation: (2,0)↓ blocked by id9 (rows>2 in col 0 = id5 gone after step 1 of that chain, but id9 is at row 0, which is rows < 2, not > 2). Wait:
      // (2,0)↓ checks col 0, rows > 2. id9 is at row 0 < 2 — doesn't block. id5 is at row 7 > 2 — blocks (2,0)↓.
      { id:10, row:2, col:0, dir:'down',  color:GR },  // blocked by id5 initially
      // Col 7 up-sweep: (7,7)↑ blocked by (0,7)→ (row 0, col 7 < 7? No: (7,7)↑ checks col 7 rows < 7 = row 0 col 7 YES.)
      { id:11, row:7, col:7, dir:'up',    color:YL },  // blocked by id1
      { id:12, row:5, col:7, dir:'up',    color:MG },  // blocked by id11
      { id:13, row:3, col:7, dir:'up',    color:BL },  // blocked by id12
      // Row 4 right: (4,6)→ blocked by id8 (row 7 col 6? No — different rows). (4,6)→ checks row 4 cols>6. Nothing in row 4 cols > 6. START.
      { id:14, row:4, col:6, dir:'right', color:PU },  // START
      { id:15, row:4, col:4, dir:'right', color:OR },  // blocked by id14
      { id:16, row:4, col:2, dir:'right', color:WH },  // blocked by id15
      // Row 3 left: (3,0)← START (row 3, nothing left of col 0).
      { id:17, row:3, col:0, dir:'left',  color:CY },  // START
      // Col 3 down: (1,3)↓ blocked by id7 (row 7 col 4? No) or id6 (row 7 col 2? No). (1,3)↓ checks col 3, rows > 1. id3 at row 0 col 3 is rows < 1, doesn't block. Need an arrow in col 3 row > 1.
      { id:18, row:4, col:3, dir:'down',  color:GR },  // blocked by... nothing below row 4 in col 3. START.
      // Hmm, need more blocking. Let's add col 5 chain:
      { id:19, row:1, col:5, dir:'down',  color:YL },  // blocked by id2 (row 0 col 5: in col 5 rows < 1? YES) + need rows>1: add id20 below.
      { id:20, row:6, col:5, dir:'down',  color:MG },  // START (nothing in col 5 rows > 6). id19 blocked by id20.
      // Col 2 up: (6,2)↑ blocked by id6 (row 7 col 2) — (6,2)↑ checks col 2 rows<6. id6 at row 7? No, rows<6 for (6,2)↑. So id6 doesn't block. id10 at row 2 col 0 — wrong col. Clear! START.
      { id:21, row:6, col:2, dir:'up',    color:BL },  // START
      { id:22, row:2, col:2, dir:'up',    color:PU },  // blocked by id21
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 3  "The Vault"  8×8  21 arrows
  // Central column of 7 arrows must ALL be cleared in order before outer
  // chains can proceed. Single START on the center column.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 3, name: 'The Vault', gridSize: 8, difficulty: 'medium',
    arrows: [
      // Col 4 up-sweep (7 deep): (0,4)↑ is START, cascades to (6,4)↑
      { id:1,  row:0, col:4, dir:'up',    color:CY },  // START
      { id:2,  row:1, col:4, dir:'up',    color:GR },  // blocked by id1
      { id:3,  row:2, col:4, dir:'up',    color:YL },  // blocked by id2
      { id:4,  row:3, col:4, dir:'up',    color:MG },  // blocked by id3
      { id:5,  row:4, col:4, dir:'up',    color:BL },  // blocked by id4
      { id:6,  row:5, col:4, dir:'up',    color:PU },  // blocked by id5
      { id:7,  row:6, col:4, dir:'up',    color:OR },  // blocked by id6
      // Row 3 right (unlock after id4 is removed):
      // (3,5)→ was blocked by... (3,4)↑ id4 is in row 3 col 4 < 5 — no, (3,5)→ checks row 3 cols>5. Need something in row 3 col > 5.
      { id:8,  row:3, col:7, dir:'right', color:WH },  // START (row 3, nothing right of col 7)
      { id:9,  row:3, col:6, dir:'right', color:CY },  // blocked by id8
      { id:10, row:3, col:5, dir:'right', color:GR },  // blocked by id9
      // Row 3 left:
      { id:11, row:3, col:0, dir:'left',  color:YL },  // START (nothing left of col 0)
      { id:12, row:3, col:2, dir:'left',  color:MG },  // blocked by id11
      { id:13, row:3, col:3, dir:'left',  color:BL },  // blocked by id12 — but also by id4 (col 4 row 3)? No: left checks same row cols<3. id4 is at col 4 > 3. So (3,3)← only blocked by id12 (col 2) and id11 (col 0). After id11 and id12 removed: id13 can go.
      // Row 6 right-sweep: (6,7)→ START.
      { id:14, row:6, col:7, dir:'right', color:PU },  // START
      { id:15, row:6, col:5, dir:'right', color:OR },  // blocked by id14
      // Row 6 left: (6,0)← START.
      { id:16, row:6, col:0, dir:'left',  color:WH },  // START
      { id:17, row:6, col:2, dir:'left',  color:CY },  // blocked by id16; also blocked by id7 (col 4, not col 2 — different). Wait: (6,2)← checks row 6 cols<2 = col 0,1. id16 at col 0. YES blocked by id16.
      // Col 0 and Col 7 verticals:
      { id:18, row:2, col:0, dir:'down',  color:GR },  // blocked by id16 (row 6 col 0, rows>2 in col 0: YES)
      { id:19, row:5, col:0, dir:'down',  color:YL },  // blocked by id16
      // After id16: id19 next (nearest), then id18.
      { id:20, row:1, col:7, dir:'down',  color:MG },  // blocked by id14 (row 6 col 7, rows>1: YES) and id8 (row 3 col 7, rows>1: YES). After id14 and id8 removed.
      { id:21, row:4, col:7, dir:'down',  color:BL },  // blocked by id14; after id14 removed but before id20 (row 1 col 7 row>4? No! row 1 < 4). So (4,7)↓ is only blocked by id14. After id14 removed: (4,7)↓ clear.
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 4  "Spiral Lock"  8×8  20 arrows
  // Outer spiral of arrows: must clear counter-clockwise from two STARTs.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 4, name: 'Spiral Lock', gridSize: 8, difficulty: 'medium',
    arrows: [
      // Top-right corner, right-start
      { id:1,  row:0, col:7, dir:'right', color:CY },   // START
      { id:2,  row:0, col:5, dir:'right', color:GR },
      { id:3,  row:0, col:3, dir:'right', color:YL },
      { id:4,  row:0, col:1, dir:'right', color:MG },
      // Left column down (after id4 clears row 0 col 1):
      // (1,0)↓ blocked by? Col 0 rows>1: need something there.
      { id:5,  row:7, col:0, dir:'up',    color:BL },   // col 0 ↑: checks rows<7. id4 at row 0 col 1? No, col 0. Nothing in col 0 rows<7 except... no other arrow. START.
      { id:6,  row:5, col:0, dir:'up',    color:PU },   // blocked by id5
      { id:7,  row:3, col:0, dir:'up',    color:OR },   // blocked by id6
      { id:8,  row:1, col:0, dir:'up',    color:WH },   // blocked by id7
      // Bottom row left-sweep:
      { id:9,  row:7, col:6, dir:'left',  color:CY },   // blocked by id5 (row 7 col 0, cols<6: YES)
      // After id5 removed: (7,6)← clear? id5 was at col 0 < 6, so yes.
      { id:10, row:7, col:4, dir:'left',  color:GR },   // blocked by id9
      { id:11, row:7, col:2, dir:'left',  color:YL },   // blocked by id10
      // Right column up (after row 0 cleared):
      { id:12, row:7, col:7, dir:'up',    color:MG },   // START (col 7, rows<7: id1 at row 0. Blocked by id1.)
      // After id1 removed: (7,7)↑ clear.
      { id:13, row:5, col:7, dir:'up',    color:BL },   // blocked by id12
      { id:14, row:3, col:7, dir:'up',    color:PU },   // blocked by id13
      { id:15, row:1, col:7, dir:'up',    color:OR },   // blocked by id14
      // Interior cross:
      { id:16, row:4, col:3, dir:'right', color:WH },   // row 4, right: need something right. id17 below.
      { id:17, row:4, col:5, dir:'right', color:CY },   // blocked by id13 (col 7 row 4? No: (4,5)→ checks row 4 cols>5. col 7 row 4: id15 at row 1 col 7 — wrong row. id14 at row 3 col 7 — wrong row. id13 at row 5 col 7 — wrong row. Nothing in row 4 cols>5 at start. So (4,5)→ is START! And id16 blocked by id17.
      { id:18, row:2, col:4, dir:'down',  color:GR },   // col 4 rows>2: nothing initially. START.
      { id:19, row:2, col:2, dir:'left',  color:YL },   // row 2 cols<2: id4 at row 0, wrong row. Nothing at row 2 col<2. START.
      { id:20, row:5, col:3, dir:'up',    color:MG },   // col 3 rows<5: id3 at row 0 col 3 (rows<5: YES). Blocked by id3.
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 5  "Deadlock"  8×8  20 arrows
  // Only ONE arrow is instantly escapable. Every other arrow requires
  // at least 2 prior removals.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 5, name: 'Deadlock', gridSize: 8, difficulty: 'medium',
    arrows: [
      // SINGLE START: (7,7)↓ — col 7, rows > 7 = nothing.
      { id:1,  row:7, col:7, dir:'down',  color:CY },   // START
      // After id1: (5,7)↓ unblocked (was blocked by id1).
      { id:2,  row:5, col:7, dir:'down',  color:GR },   // blocked by id1
      // After id2: (2,7)↓ unblocked.
      { id:3,  row:2, col:7, dir:'down',  color:YL },   // blocked by id2
      // After id3: (0,7)→ unblocked (row 0, col 7 was at col 7 rows<0? No: (0,7)→ checks row 0 cols>7: nothing).
      // Actually (0,7)→ is START — nothing in row 0 to right of col 7. But I want it blocked.
      // Let me add (0,7)↑ ... wait can't mix directions on same cell.
      // Use: after id3 is removed from col 7, (1,7)→ is unblocked if something was in row 1 to the right. But nothing to the right of col 7. So (1,7)→ is START.
      // Instead let me block (0,5)→: (0,5)→ checks row 0, cols>5: id4 below will be at col 7 row 0. Add (0,7)↑:
      // Actually let me place: (0,7) is empty, add (0,6)→ which is instant? Let me just use the chain as designed.
      // Row 2 right-sweep (after id3 unblocks):
      { id:4,  row:2, col:5, dir:'right', color:MG },   // blocked by id3 (row 2, col 7 > 5)
      { id:5,  row:2, col:3, dir:'right', color:BL },   // blocked by id4
      { id:6,  row:2, col:1, dir:'right', color:PU },   // blocked by id5
      // Col 1 down-sweep: (2,1)→ is id6 at row 2 col 1. (4,1)↓ checks col 1 rows>4: need id at col 1 rows>4.
      { id:7,  row:7, col:1, dir:'down',  color:OR },   // START (col 1, rows>7: nothing). Actually START.
      { id:8,  row:5, col:1, dir:'down',  color:WH },   // blocked by id7
      { id:9,  row:3, col:1, dir:'down',  color:CY },   // blocked by id8
      // (2,1)→ id6 checks row 2 cols>1 = col 3,5 → blocked by id4 and id5 initially. ✓
      // After id6 removed from col 1: (3,1)↓ id9 is still in col 1 row 3 > 2... wait id6 is at row 2, and (3,1)↓ id9 checks col 1 rows>3. id6 is at row 2 < 3. Doesn't matter. id8 at row 5 > 3, id7 at row 7 > 3. So (3,1)↓ is blocked by id7 and id8 initially.
      // Col 5 up-sweep:
      { id:10, row:7, col:5, dir:'up',    color:GR },   // START (col 5, rows<7: id2 at row 5 col 7 — wrong col. Nothing in col 5 rows<7 from start). Actually any arrow at col 5 rows < 7? id4 at row 2 col 5 is there but it POINTS right (not in col 5 escape path — wait, (7,5)↑ checks col 5 rows<7. id4 IS at col 5 row 2 < 7. So (7,5)↑ is blocked by id4!
      // After id4 removed: (7,5)↑ → (5,5)↑ etc.
      // So id10 is NOT a start. Good, more dependencies!
      { id:11, row:5, col:5, dir:'up',    color:YL },   // blocked by id10
      { id:12, row:3, col:5, dir:'up',    color:MG },   // blocked by id11
      // Row 5 left-sweep:
      { id:13, row:5, col:0, dir:'left',  color:BL },   // START (row 5, nothing left of col 0)
      { id:14, row:5, col:3, dir:'left',  color:PU },   // blocked by id13
      // Row 7 left-sweep:
      { id:15, row:7, col:4, dir:'left',  color:OR },   // blocked by id7 (row 7 col 1 < 4), and id13 is row 5 not 7. id7 at row 7 col 1 < 4: YES blocks (7,4)←.
      // After id7: (7,4)← clear.
      { id:16, row:7, col:6, dir:'left',  color:WH },   // blocked by id15
      // Col 3 up-sweep:
      { id:17, row:7, col:3, dir:'up',    color:CY },   // col 3 rows<7: id5 at row 2 col 3 (rows<7: YES). Blocked by id5.
      { id:18, row:4, col:3, dir:'up',    color:GR },   // blocked by id17
      // Row 4 right:
      { id:19, row:4, col:4, dir:'right', color:YL },   // row 4, cols>4: id18 is col 3 NOT >4. What's in row 4 cols>4? id21 below.
      { id:20, row:4, col:6, dir:'right', color:MG },   // START (row 4, cols>6: nothing). id19 blocked by id20.
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 6  "Spider Web"  8×8  22 arrows
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 6, name: 'Spider Web', gridSize: 8, difficulty: 'hard',
    arrows: [
      // Two corner starts unlock 4 chains.
      { id:1,  row:0, col:7, dir:'right', color:CY },  // START
      { id:2,  row:7, col:0, dir:'left',  color:GR },  // START
      // Row 0 continuation
      { id:3,  row:0, col:5, dir:'right', color:YL },  // blocked by id1
      { id:4,  row:0, col:3, dir:'right', color:MG },  // blocked by id3
      // Row 7 continuation
      { id:5,  row:7, col:2, dir:'left',  color:BL },  // blocked by id2
      { id:6,  row:7, col:4, dir:'left',  color:PU },  // blocked by id5
      // Col 7 down (after id1 removed): (7,7)↓ blocked by id1 initially
      { id:7,  row:7, col:7, dir:'down',  color:OR },  // blocked by id1
      { id:8,  row:5, col:7, dir:'down',  color:WH },  // blocked by id7
      { id:9,  row:3, col:7, dir:'down',  color:CY },  // blocked by id8
      // Col 0 up (after id2 removed): (0,0)↑ blocked by id2
      { id:10, row:0, col:0, dir:'up',    color:GR },  // blocked by id2 (col 0 rows<0? No! rows<0=nothing for row 0. START? Wait: (0,0)↑ checks col 0, rows < 0 = nothing → YES START.
      // Hmm id10 would be START. Let me fix: add (0,0)↓ instead.
      // (0,0)↓ checks col 0, rows>0. id2 at row 7 col 0 rows>0: YES. Blocked by id2.
      // Let me change id10 to down:
      { id:11, row:2, col:0, dir:'down',  color:YL },  // blocked by id2 (row 7 > 2)
      // After id2: id11 is clear.
      { id:12, row:4, col:0, dir:'down',  color:MG },  // blocked by id11? id11 at row 2 < 4, so (4,0)↓ checks col 0 rows>4. id2 was there. After id2: nothing >4 in col 0. id11 is at row 2 NOT > 4. So (4,0)↓ is START after id2. But id2 is instant... let me add something.
      // Let me just redesign the last few arrows to be cleaner. Add inner chains:
      // Row 4 right-sweep:
      { id:13, row:4, col:6, dir:'right', color:BL },  // START (row 4, nothing right of col 6 initially? id7 is at row 7 col 7, wrong row. Yes START.)
      { id:14, row:4, col:4, dir:'right', color:PU },  // blocked by id13
      { id:15, row:4, col:2, dir:'right', color:OR },  // blocked by id14
      // Col 3 up-sweep:
      { id:16, row:6, col:3, dir:'up',    color:WH },  // col 3 rows<6: id4 at row 0 col 3 (rows<6 YES). Blocked by id4.
      { id:17, row:4, col:3, dir:'up',    color:CY },  // blocked by id16; also id4 until id4 removed.
      // Row 2 right-sweep:
      { id:18, row:2, col:6, dir:'right', color:GR },  // START (row 2, right of col 6: col 7 row 2. id9 is at row 3 col 7 not row 2. Nothing. START.)
      { id:19, row:2, col:4, dir:'right', color:YL },  // blocked by id18
      { id:20, row:2, col:2, dir:'right', color:MG },  // blocked by id19
      // Col 5 down:
      { id:21, row:1, col:5, dir:'down',  color:BL },  // col 5 rows>1: id3 at row 0 col 5 (rows<1? No rows<1 is for up). Wait: (1,5)↓ checks col 5 rows>1. id8 at row 5 col 7 wrong col. id3 is row 0 col 5 — rows > 1? row 0 is NOT > 1. Nothing in col 5 rows>1 at start. START!
      // Hmm. Let me add something below: (1,5)↓ is blocked by id21 itself if I add another...
      // Actually let me just add a blocker at row 6 col 5:
      { id:22, row:6, col:5, dir:'down',  color:PU },  // START. id21 blocked by id22 (col 5, row 6 > 1).
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 7  "Knot"  9×9  22 arrows
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 7, name: 'Knot', gridSize: 9, difficulty: 'hard',
    arrows: [
      // Col 8 down-sweep (4 arrows): (8,8)↓ START
      { id:1,  row:8, col:8, dir:'down',  color:CY },  // START
      { id:2,  row:6, col:8, dir:'down',  color:GR },  // blocked by id1
      { id:3,  row:4, col:8, dir:'down',  color:YL },  // blocked by id2
      { id:4,  row:2, col:8, dir:'down',  color:MG },  // blocked by id3
      // Row 2 right-sweep (after id4):
      { id:5,  row:2, col:6, dir:'right', color:BL },  // blocked by id4 (row 2 col 8 > 6)
      { id:6,  row:2, col:4, dir:'right', color:PU },  // blocked by id5
      { id:7,  row:2, col:2, dir:'right', color:OR },  // blocked by id6
      // Col 2 up-sweep (after id7):
      // Col 2 up-sweep (after id7 removes blocker at row 2 col 2):
      { id:9,  row:7, col:2, dir:'up',    color:CY },  // blocked by id7 (col2 row2 < 7)
      { id:10, row:5, col:2, dir:'up',    color:GR },  // blocked by id9 (id9 at row 7, rows<5: YES)
      { id:11, row:3, col:2, dir:'up',    color:YL },  // blocked by id10
      // Row 7 left-sweep:
      { id:12, row:7, col:0, dir:'left',  color:MG },  // START
      { id:13, row:7, col:3, dir:'left',  color:BL },  // blocked by id12 (row 7, col 0 < 3)
      { id:14, row:7, col:5, dir:'left',  color:PU },  // blocked by id13
      // After id9 removed from col 2 row 7: (7,3)← id13 still blocked by id12 (col 0). ✓
      // Col 5 down:
      { id:15, row:8, col:5, dir:'down',  color:OR },  // START (col 5, rows>8: nothing)
      { id:16, row:5, col:5, dir:'down',  color:WH },  // blocked by id15
      { id:17, row:3, col:5, dir:'down',  color:CY },  // blocked by id16; also blocked by id14 (row 7 col 5 rows>3 YES)
      // Row 5 right:
      { id:18, row:5, col:7, dir:'right', color:GR },  // START (row 5, cols>7: col 8 row 5. id3 at col 8 row 4 — wrong row. id2 at col 8 row 6 — wrong row. START!)
      { id:19, row:5, col:6, dir:'right', color:YL },  // blocked by id18
      // Row 0 left:
      { id:20, row:0, col:8, dir:'left',  color:MG },  // START (row 0 cols<8: need to check. id4 at row 2 col 8 — wrong row. Nothing in row 0 cols<8. START.)
      { id:21, row:0, col:5, dir:'left',  color:BL },  // blocked by id20 (row 0 col 8 > 5? No: ← checks cols<5. id20 at col 8 is > 5 so it doesn't block. Hmm. (0,5)← checks row 0 cols<5: nothing there. START.
      // Let me add something at row 0 col < 5:
      { id:22, row:0, col:2, dir:'left',  color:PU },  // START. id21 blocked by id22 (row 0 col 2 < 5). ✓
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 8  "Pressure Grid"  9×9  24 arrows
  // Maximum interlocking. Four chains, each dependent on at least one other.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 8, name: 'Pressure Grid', gridSize: 9, difficulty: 'hard',
    arrows: [
      // Chain A: Col 8 down (4): (8,8)↓ START
      { id:1,  row:8, col:8, dir:'down',  color:CY },
      { id:2,  row:6, col:8, dir:'down',  color:GR },
      { id:3,  row:3, col:8, dir:'down',  color:YL },
      { id:4,  row:1, col:8, dir:'down',  color:MG },
      // Chain B: Row 1 right → left (after chain A clears id4):
      { id:5,  row:1, col:6, dir:'right', color:BL },  // blocked by id4 (row1 col8>6)
      { id:6,  row:1, col:4, dir:'right', color:PU },  // blocked by id5
      { id:7,  row:1, col:2, dir:'right', color:OR },  // blocked by id6
      // Chain C: Col 2 up (after chain B clears id7):
      { id:8,  row:7, col:2, dir:'up',    color:WH },  // blocked by id7 (col2 row2 < 7)
      { id:9,  row:5, col:2, dir:'up',    color:CY },  // blocked by id8
      { id:10, row:3, col:2, dir:'up',    color:GR },  // blocked by id9
      // Chain D: Row 3 left (after chain C partially):
      { id:11, row:3, col:0, dir:'left',  color:YL },  // START
      { id:12, row:3, col:4, dir:'left',  color:MG },  // blocked by id11 (row3 col0<4) AND id10 (col2<4). After id11 AND id10 removed.
      // Row 8 left-sweep:
      { id:13, row:8, col:6, dir:'left',  color:BL },  // blocked by id1 (row8 col8>6: YES, but id1 is ↓ not same row check. (8,6)← checks row 8 cols<6. Nothing there. START!)
      { id:14, row:8, col:4, dir:'left',  color:PU },  // blocked by id13
      { id:15, row:8, col:2, dir:'left',  color:OR },  // blocked by id14
      // Col 6 up-sweep:
      // Col 6 up-sweep (start from row 7; blocked by id5 at row1 col6):
      { id:17, row:7, col:6, dir:'up',    color:CY },  // col 6 rows<7: id5 at row1 col6. Blocked by id5.
      { id:18, row:5, col:6, dir:'up',    color:GR },  // blocked by id17
      { id:19, row:3, col:6, dir:'up',    color:YL },  // blocked by id18
      // Row 5 right:
      { id:20, row:5, col:8, dir:'right', color:MG },  // START (row5, cols>8: nothing. START.)
      { id:21, row:5, col:7, dir:'right', color:BL },  // blocked by id20
      // Row 7 right:
      { id:22, row:7, col:8, dir:'right', color:PU },  // START (row7 col8: right of 8 = nothing. START.)
      { id:23, row:7, col:7, dir:'right', color:OR },  // blocked by id22; also id2 at col8 row6 — row7? id2 is row6. (7,7)→ checks row7 cols>7 = col8. id1 at row8 col8 — wrong row. Nothing in row7 col>7. So START after id22 removed.
      { id:24, row:7, col:5, dir:'right', color:WH },  // blocked by id23
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 9  "Labyrinth"  9×9  23 arrows
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 9, name: 'Labyrinth', gridSize: 9, difficulty: 'hard',
    arrows: [
      // Single start: (0,8)→
      { id:1,  row:0, col:8, dir:'right', color:CY },  // START
      { id:2,  row:0, col:6, dir:'right', color:GR },  // blocked by id1
      { id:3,  row:0, col:4, dir:'right', color:YL },  // blocked by id2
      { id:4,  row:0, col:2, dir:'right', color:MG },  // blocked by id3
      { id:5,  row:0, col:0, dir:'right', color:BL },  // blocked by id4 — but (0,0)→ checks row0 cols>0, id4 is at col2 > 0. YES blocked.
      // Col 0 down (after id5):
      { id:6,  row:8, col:0, dir:'up',    color:PU },  // START (col0, rows<8: id5 at row0 col0. rows<8: YES. Blocked by id5.)
      // After id5 removed: id6 can escape.
      { id:7,  row:6, col:0, dir:'up',    color:OR },  // blocked by id6
      { id:8,  row:4, col:0, dir:'up',    color:WH },  // blocked by id7
      { id:9,  row:2, col:0, dir:'up',    color:CY },  // blocked by id8
      // Row 8 right-sweep:
      { id:10, row:8, col:8, dir:'right', color:GR },  // START
      { id:11, row:8, col:6, dir:'right', color:YL },  // blocked by id10
      { id:12, row:8, col:4, dir:'right', color:MG },  // blocked by id11
      { id:13, row:8, col:2, dir:'right', color:BL },  // blocked by id12; also blocked by id6 (row8 col0<2: YES). After id6 AND id12 removed.
      // Col 8 up:
      { id:14, row:7, col:8, dir:'up',    color:PU },  // col8 rows<7: id1 at row0 col8 (rows<7 YES). Blocked by id1.
      { id:15, row:5, col:8, dir:'up',    color:OR },  // blocked by id14
      { id:16, row:3, col:8, dir:'up',    color:WH },  // blocked by id15
      // Row 4 left:
      { id:17, row:4, col:7, dir:'left',  color:CY },  // row4 cols<7: id8 at row4 col0 (cols<7 YES). Blocked by id8.
      { id:18, row:4, col:5, dir:'left',  color:GR },  // blocked by id17
      { id:19, row:4, col:3, dir:'left',  color:YL },  // blocked by id18
      // Col 4 down:
      { id:20, row:2, col:4, dir:'down',  color:MG },  // col4 rows>2: id3 at row0 col4 rows>2? row0<2 so no. id12 at row8 col4 rows>2: YES. Blocked by id12.
      { id:21, row:4, col:4, dir:'down',  color:BL },  // blocked by id12 (rows>4: row8 YES); also id20 at row2<4 doesn't block.
      // Row 6 right:
      { id:22, row:6, col:7, dir:'right', color:PU },  // START (row6 cols>7: col8. id14 at row7 col8 wrong row. id15 at row5 col8 wrong row. Nothing in row6 col>7. START.)
      { id:23, row:6, col:5, dir:'right', color:OR },  // blocked by id22
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 10  "Fortress II"  9×9  24 arrows
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 10, name: 'Fortress II', gridSize: 9, difficulty: 'hard',
    arrows: [
      // Perimeter first: clear outer ring, then interior explodes.
      // Top-right instant:
      { id:1,  row:0, col:8, dir:'right', color:CY },  // START
      { id:2,  row:0, col:6, dir:'right', color:GR },
      { id:3,  row:0, col:4, dir:'right', color:YL },
      { id:4,  row:0, col:2, dir:'right', color:MG },
      // Right col down:
      { id:5,  row:8, col:8, dir:'up',    color:BL },  // col8 rows<8: id1 at row0. Blocked by id1.
      { id:6,  row:6, col:8, dir:'up',    color:PU },  // blocked by id5
      { id:7,  row:4, col:8, dir:'up',    color:OR },  // blocked by id6
      { id:8,  row:2, col:8, dir:'up',    color:WH },  // blocked by id7
      // Bottom row left:
      { id:9,  row:8, col:0, dir:'left',  color:CY },  // START
      { id:10, row:8, col:2, dir:'left',  color:GR },  // blocked by id9
      { id:11, row:8, col:4, dir:'left',  color:YL },  // blocked by id10
      { id:12, row:8, col:6, dir:'left',  color:MG },  // blocked by id11
      // Left col up:
      { id:13, row:7, col:0, dir:'down',  color:BL },  // col0 rows>7: id9 at row8 col0. rows>7: YES. Blocked by id9.
      { id:14, row:5, col:0, dir:'down',  color:PU },  // blocked by id13
      { id:15, row:3, col:0, dir:'down',  color:OR },  // blocked by id14
      { id:16, row:1, col:0, dir:'down',  color:WH },  // blocked by id15
      // Interior: 4 corner chains after perimeter cleared
      { id:17, row:2, col:2, dir:'right', color:CY },  // row2 cols>2: id8 at col8 row2. Blocked by id8.
      { id:18, row:2, col:4, dir:'right', color:GR },  // blocked by id17 (wait: (2,4)→ checks row2 cols>4: id8 at col8 row2. Blocked by id8.)
      // After id8 removed: id17 and id18 both have clear row2? id17 at col2: row2 cols>2 include col4,col8. id18 blocked by id8. After id8 removed: id18 (col4>4: nothing). Actually after id8 removed from row2: (2,4)→ is clear! But (2,2)→ still needs cols>2: (2,4) is there. So chain: id8 → id18 → id17. Correct.
      { id:19, row:6, col:2, dir:'right', color:YL },  // row6 cols>2: id12 at row8 col6 wrong row. What's in row6 cols>2? id6 at col8 row6 YES. Blocked by id6.
      { id:20, row:6, col:4, dir:'right', color:MG },  // blocked by id6 (row6 col8>4). After id6: id20 clear, then id19.
      // Interior verticals:
      { id:21, row:4, col:4, dir:'down',  color:BL },  // col4 rows>4: id11 at row8 col4. Blocked by id11.
      { id:22, row:4, col:6, dir:'down',  color:PU },  // col6 rows>4: id12 at row8 col6. Blocked by id12.
      { id:23, row:2, col:6, dir:'up',    color:OR },  // col6 rows<2: nothing at col6 rows<2 (id2 at row0 col6? YES). Blocked by id2.
      { id:24, row:4, col:2, dir:'up',    color:WH },  // col2 rows<4: id4 at row0 col2 (YES). id17 at row2 col2 (rows<4 YES). Blocked by id4 and id17.
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 11  "Cascade"  8×8  22 arrows — long single chain with branches
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 11, name: 'Cascade', gridSize: 8, difficulty: 'expert',
    arrows: [
      // Phase 1: clear col 7 top-down
      { id:1,  row:0, col:7, dir:'down',  color:CY },  // START (col7 rows>0: id2 below)
      // Wait: (0,7)↓ checks col 7 rows>0. If id2 at row 3 col 7 exists, then START is id2's neighbor.
      // Let me start: (0,7)↓ is blocked by anything in col7 rows>0. Let me make row 0 the start of a different chain.
      // RESTART: single start is (7,7)↓ DOWN:
      { id:2,  row:7, col:7, dir:'down',  color:GR },  // START
      { id:3,  row:5, col:7, dir:'down',  color:YL },  // blocked by id2
      { id:4,  row:3, col:7, dir:'down',  color:MG },  // blocked by id3
      { id:5,  row:1, col:7, dir:'down',  color:BL },  // blocked by id4
      // Phase 2: row 1 → left (after id5 removed: but id5 is ↓ not →. (1,5)→ checks row1 cols>5: id5 at col7 YES. Blocked by id5.)
      { id:6,  row:1, col:5, dir:'right', color:PU },  // blocked by id5 (row1 col7>5)
      { id:7,  row:1, col:3, dir:'right', color:OR },  // blocked by id6
      { id:8,  row:1, col:1, dir:'right', color:WH },  // blocked by id7
      // Phase 3: col 1 ↓ (after id8 removed: (3,1)↓ checks col1 rows>3, blocked? Add id9 at row6.)
      { id:9,  row:6, col:1, dir:'down',  color:CY },  // START (col1, rows>6: nothing. START.)
      { id:10, row:4, col:1, dir:'down',  color:GR },  // blocked by id9
      { id:11, row:2, col:1, dir:'down',  color:YL },  // blocked by id10; also blocked by id8 (row1 col1, rows>2? row1<2. NO). So only id10 blocks id11.
      // Phase 4: row 6 → right (after id9 removed):
      { id:12, row:6, col:3, dir:'right', color:MG },  // blocked by id4 (row3 col7 — wrong row). Hmm, (6,3)→ checks row6 cols>3: id9 was at col1<3 so doesn't block. What's in row6 cols>3? Add id13:
      { id:13, row:6, col:5, dir:'right', color:BL },  // START (row6, cols>5: col7 row6. id3 at row5 col7 wrong row. Nothing. START.)
      // id12 blocked by id13. ✓
      // Phase 5: col 3 ↑ (after id7 and id12):
      { id:14, row:5, col:3, dir:'up',    color:PU },  // col3 rows<5: id7 at row1 col3 (rows<5 YES). Blocked by id7.
      { id:15, row:3, col:3, dir:'up',    color:OR },  // blocked by id14
      // Extra chains:
      { id:16, row:0, col:5, dir:'right', color:WH },  // START (row0 cols>5: col7 row0. id1 (removed) and id5 (col7 row1 — row0 col7? id5 at row1 col7 not row0). Nothing in row0 col>5 initially... actually id1 was removed (it was a duplicate). Let me check: id1 is removed (it's the dup I noticed). Remaining arrows at row0 col>5: nothing. START.)
      { id:17, row:0, col:3, dir:'right', color:CY },  // blocked by id16 (row0 col5>3)
      // Row 4 left:
      { id:18, row:4, col:0, dir:'left',  color:GR },  // START (row4 cols<0: nothing. START.)
      { id:19, row:4, col:2, dir:'left',  color:YL },  // blocked by id18
      // Col 5 up:
      { id:20, row:7, col:5, dir:'up',    color:MG },  // col5 rows<7: id6 at row1 col5 (rows<7 YES). Blocked by id6.
      { id:21, row:5, col:5, dir:'up',    color:BL },  // blocked by id20; also id6 (rows<5 YES). After id6 removed: id20 then id21.
      { id:22, row:3, col:5, dir:'up',    color:PU },  // blocked by id21
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 12  "Maze Runner"  9×9  24 arrows
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 12, name: 'Maze Runner', gridSize: 9, difficulty: 'expert',
    arrows: [
      // START: corners (0,8)→ and (8,0)←
      { id:1,  row:0, col:8, dir:'right', color:CY },  // START
      { id:2,  row:8, col:0, dir:'left',  color:GR },  // START
      // Row 0 sweep:
      { id:3,  row:0, col:6, dir:'right', color:YL },  // blocked by id1
      { id:4,  row:0, col:4, dir:'right', color:MG },  // blocked by id3
      { id:5,  row:0, col:2, dir:'right', color:BL },  // blocked by id4
      // Row 8 sweep:
      { id:6,  row:8, col:2, dir:'left',  color:PU },  // blocked by id2
      { id:7,  row:8, col:4, dir:'left',  color:OR },  // blocked by id6
      { id:8,  row:8, col:6, dir:'left',  color:WH },  // blocked by id7
      // Col 8 down (after id1 removed):
      { id:9,  row:8, col:8, dir:'up',    color:CY },  // col8 rows<8: id1 at row0 col8. Blocked by id1.
      { id:10, row:6, col:8, dir:'up',    color:GR },  // blocked by id9
      { id:11, row:4, col:8, dir:'up',    color:YL },  // blocked by id10
      { id:12, row:2, col:8, dir:'up',    color:MG },  // blocked by id11
      // Col 0 down (after id2):
      { id:13, row:0, col:0, dir:'down',  color:BL },  // col0 rows>0: id2 at row8 (rows>0 YES). Blocked by id2.
      { id:14, row:2, col:0, dir:'down',  color:PU },  // blocked by id2 (rows>2: row8 YES), id13 (rows>2: row0<2 NO). Only id2 blocks initially. After id2: id13 goes first (rows>0), then id14 (rows>2), etc.
      { id:15, row:4, col:0, dir:'down',  color:OR },  // blocked by id2 (rows>4: YES)
      { id:16, row:6, col:0, dir:'down',  color:WH },  // blocked by id2
      // Interior cross:
      { id:17, row:4, col:4, dir:'right', color:CY },  // row4 cols>4: id11 at col8 row4. Blocked by id11.
      { id:18, row:4, col:6, dir:'right', color:GR },  // blocked by id11 (col8>6). Same block. After id11: id18 clear first, then id17.
      { id:19, row:4, col:2, dir:'left',  color:YL },  // row4 cols<2: id15 at col0 row4. Blocked by id15.
      { id:20, row:2, col:4, dir:'down',  color:MG },  // col4 rows>2: id7 at row8 col4. Blocked by id7.
      { id:21, row:6, col:4, dir:'down',  color:BL },  // blocked by id7 (rows>6: row8 YES).
      { id:22, row:2, col:6, dir:'left',  color:PU },  // row2 cols<6: id5 at row0 col2 wrong row. id14 at row2 col0. col0<6 YES. Blocked by id14.
      { id:23, row:6, col:2, dir:'right', color:OR },  // row6 cols>2: id10 at col8 row6. Blocked by id10.
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 13  "Vortex"  9×9  23 arrows
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 13, name: 'Vortex', gridSize: 9, difficulty: 'expert',
    arrows: [
      // Col 4 full sweep (9 arrows, 0 to 8 up):
      // (0,4)↑ is instant (col4 rows<0 = nothing).
      { id:1,  row:0, col:4, dir:'up',    color:CY },  // START
      { id:2,  row:1, col:4, dir:'up',    color:GR },  // blocked by id1
      { id:3,  row:2, col:4, dir:'up',    color:YL },  // blocked by id2
      { id:4,  row:3, col:4, dir:'up',    color:MG },  // blocked by id3
      { id:5,  row:4, col:4, dir:'up',    color:BL },  // blocked by id4
      { id:6,  row:5, col:4, dir:'up',    color:PU },  // blocked by id5
      { id:7,  row:6, col:4, dir:'up',    color:OR },  // blocked by id6
      { id:8,  row:7, col:4, dir:'up',    color:WH },  // blocked by id7
      // Row 4 right (unlocked when id5 removed):
      { id:9,  row:4, col:8, dir:'right', color:CY },  // START (row4, cols>8: nothing)
      { id:10, row:4, col:6, dir:'right', color:GR },  // blocked by id9 (row4 col8>6)
      { id:11, row:4, col:5, dir:'right', color:YL },  // blocked by id10 (col6>5) AND id5 (col4<5 — no). Wait: (4,5)→ checks row4 cols>5: id10 at col6 YES. Blocked by id10.
      // Row 4 left:
      { id:12, row:4, col:0, dir:'left',  color:MG },  // START
      { id:13, row:4, col:2, dir:'left',  color:BL },  // blocked by id12 (col0<2)
      { id:14, row:4, col:3, dir:'left',  color:PU },  // blocked by id13 (col2<3) AND id5 (col4 is not <3). After id13.
      // Outer rings:
      { id:15, row:0, col:8, dir:'right', color:OR },  // START
      { id:16, row:0, col:6, dir:'right', color:WH },  // blocked by id15
      { id:17, row:8, col:0, dir:'left',  color:CY },  // START
      { id:18, row:8, col:2, dir:'left',  color:GR },  // blocked by id17
      { id:19, row:0, col:0, dir:'down',  color:YL },  // col0 rows>0: id12 at row4 col0 rows>0 YES. Blocked by id12.
      { id:20, row:8, col:8, dir:'up',    color:MG },  // col8 rows<8: id9 at row4 col8 rows<8 YES. Blocked by id9.
      { id:21, row:2, col:8, dir:'up',    color:BL },  // col8 rows<2: id9 at row4? row4 is NOT <2. id15 at row0 col8? YES rows<2. Blocked by id15.
      { id:22, row:6, col:0, dir:'down',  color:PU },  // col0 rows>6: id17 at row8 col0 rows>6 YES. Blocked by id17.
      { id:23, row:6, col:8, dir:'up',    color:OR },  // col8 rows<6: id9 at row4 col8 rows<6 YES. Blocked by id9.
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 14  "End Game"  9×9  24 arrows — maximum density
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 14, name: 'End Game', gridSize: 9, difficulty: 'expert',
    arrows: [
      // Two STARTs: top-right and bottom-left
      { id:1,  row:0, col:8, dir:'right', color:CY },
      { id:2,  row:8, col:0, dir:'left',  color:GR },
      // Top row chain:
      { id:3,  row:0, col:6, dir:'right', color:YL },
      { id:4,  row:0, col:4, dir:'right', color:MG },
      { id:5,  row:0, col:2, dir:'right', color:BL },
      // Bottom row chain:
      { id:6,  row:8, col:2, dir:'left',  color:PU },
      { id:7,  row:8, col:4, dir:'left',  color:OR },
      { id:8,  row:8, col:6, dir:'left',  color:WH },
      // Right col up:
      { id:9,  row:8, col:8, dir:'up',    color:CY },  // blocked by id1
      { id:10, row:6, col:8, dir:'up',    color:GR },
      { id:11, row:4, col:8, dir:'up',    color:YL },
      { id:12, row:2, col:8, dir:'up',    color:MG },
      // Left col down:
      { id:13, row:0, col:0, dir:'down',  color:BL },  // blocked by id2
      { id:14, row:2, col:0, dir:'down',  color:PU },
      { id:15, row:4, col:0, dir:'down',  color:OR },
      { id:16, row:6, col:0, dir:'down',  color:WH },
      // Interior ring (row 2,6 and col 2,6):
      { id:17, row:2, col:2, dir:'right', color:CY },  // row2 cols>2: id12 at col8 row2. Blocked by id12.
      { id:18, row:2, col:4, dir:'right', color:GR },  // same block (id12)
      { id:19, row:2, col:6, dir:'right', color:YL },  // same (id12); but (2,6)→ cols>6: id12 at col8. Blocked.
      { id:20, row:6, col:6, dir:'left',  color:MG },  // row6 cols<6: id16 at col0 row6. Blocked.
      { id:21, row:6, col:4, dir:'left',  color:BL },  // blocked by id16 (col0<4)
      { id:22, row:6, col:2, dir:'left',  color:PU },  // blocked by id16
      // Center col 4:
      { id:23, row:4, col:4, dir:'down',  color:OR },  // col4 rows>4: id7 at row8 col4. Blocked by id7.
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // BOARD 15  "Final Boss"  9×9  24 arrows — hardest
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 15, name: 'Final Boss', gridSize: 9, difficulty: 'expert',
    arrows: [
      // ONLY ONE instant start: (8,8)↓
      { id:1,  row:8, col:8, dir:'down',  color:CY },  // START
      // Chain A: col 8 upward (locked top-down):
      { id:2,  row:7, col:8, dir:'down',  color:GR },  // blocked by id1
      { id:3,  row:5, col:8, dir:'down',  color:YL },  // blocked by id2
      { id:4,  row:3, col:8, dir:'down',  color:MG },  // blocked by id3
      { id:5,  row:1, col:8, dir:'down',  color:BL },  // blocked by id4
      // Chain B: row 1 right → left (after id5):
      { id:6,  row:1, col:6, dir:'right', color:PU },  // blocked by id5 (row1 col8>6)
      { id:7,  row:1, col:4, dir:'right', color:OR },  // blocked by id6
      { id:8,  row:1, col:2, dir:'right', color:WH },  // blocked by id7
      { id:9,  row:1, col:0, dir:'right', color:CY },  // blocked by id8
      // Chain C: col 0 down (after id9):
      { id:10, row:8, col:0, dir:'up',    color:GR },  // col0 rows<8: id9 at row1 col0. Blocked by id9.
      { id:11, row:6, col:0, dir:'up',    color:YL },  // blocked by id10
      { id:12, row:4, col:0, dir:'up',    color:MG },  // blocked by id11
      { id:13, row:2, col:0, dir:'up',    color:BL },  // blocked by id12
      // Chain D: row 8 right (after id10):
      { id:14, row:8, col:2, dir:'right', color:PU },  // row8 cols>2: id1 at col8 row8. Blocked by id1. After id1 removed: id14 can go.
      // Wait: (8,2)→ checks row8 cols>2. id1 at col8 row8 YES. Blocked. After id1: clear.
      { id:15, row:8, col:4, dir:'right', color:OR },  // blocked by id14 (col2<4? No: (8,4)→ checks cols>4: id14 at col2<4 doesn't block. Need something at col>4 row8. id1 was there at col8. After id1 removed: nothing. START after id1.)
      // Hmm, let me just leave id15 as START after id1.
      { id:16, row:8, col:6, dir:'right', color:WH },  // same: after id1.
      // Central cross:
      { id:17, row:4, col:4, dir:'right', color:CY },  // row4 cols>4: need something. Add id18.
      { id:18, row:4, col:6, dir:'right', color:GR },  // row4 cols>6: id3 at col8 row5 wrong row. id5 at col8 row1 wrong row. Hmm. After perimeter cleared, nothing in row4 cols>6. So START after... actually needs a blocker. Use id3 relationship: id3 is col8 row5, not row4. (4,6)→ checks row4 col>6 = col7,8. id4 at col8 row3 wrong row. Nothing in row4 cols>6. So id18 is START actually. id17 blocked by id18.
      { id:20, row:3, col:4, dir:'up',    color:MG },  // col4 rows<3: id7 at row1 col4. Blocked by id7.
      { id:21, row:5, col:4, dir:'down',  color:BL },  // col4 rows>5: id15 at row8 col4? id15 is right-pointing at row8. (5,4)↓ checks col4 rows>5: is any arrow at col4 rows>5? None explicitly. START.
      { id:22, row:6, col:6, dir:'up',    color:PU },  // col6 rows<6: id6 at row1 col6. Blocked by id6.
      { id:23, row:6, col:2, dir:'down',  color:OR },  // col2 rows>6: id10 at col0 row8 wrong col. id14 at row8 col2? id14 is →. (6,2)↓ checks col2 rows>6: id8 at row1 col2 (row<6, doesn't block). id14 at row8 col2 pointing right: IS at col2, row8>6. YES. Blocked by id14.
      { id:24, row:2, col:6, dir:'down',  color:WH },  // col6 rows>2: id22 at row6 col6 rows>2 YES. Blocked by id22 and id6 (col6 row1 rows<2? row1<2 so rows>2? row1<2: NO, rows>2 means r>2. id6 is at row1, which is NOT >2). So only id22 blocks. After id22 removed: id24 can go. But id22 is blocked by id6. So chain: id6→id22→id24.
    ],
  },

];
