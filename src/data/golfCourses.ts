import type { GolfCourse } from '../types';

/**
 * 15 harder minimalist golf courses.
 * SVG viewBox: 0 0 600 900.
 * Ball radius: 14  |  Hole radius: 18  |  Wall stroke: 14.
 *
 * Walls are line segments the ball bounces off.
 * The four viewBox edges are always implicit hard boundaries.
 * All courses have been verified to have at least one achievable path.
 */
export const golfCourses: GolfCourse[] = [

  {
    // Tight double-gate: two barriers with opposite gaps force a wide angle.
    id: 1, name: 'Double Gate', par: 2,
    ballStart: { x: 300, y: 800 },
    hole:      { x: 300, y: 100 },
    walls: [
      { x1: 0,   y1: 600, x2: 360, y2: 600 },  // left wall, gap right (360–600)
      { x1: 240, y1: 340, x2: 600, y2: 340 },  // right wall, gap left (0–240)
    ],
  },

  {
    // Box fortress: hole inside 3-sided box. Floor has a gate (gap 240–360)
    // so the ball enters from below; top has a narrower gap to exit for par 3.
    id: 2, name: 'Fortress', par: 3,
    ballStart: { x: 300, y: 820 },
    hole:      { x: 300, y: 220 },
    walls: [
      { x1: 160, y1: 440, x2: 240, y2: 440 },  // box floor-left  (gate 240–360)
      { x1: 360, y1: 440, x2: 440, y2: 440 },  // box floor-right
      { x1: 160, y1: 160, x2: 160, y2: 440 },  // box left side
      { x1: 440, y1: 160, x2: 440, y2: 440 },  // box right side
      { x1: 160, y1: 160, x2: 230, y2: 160 },  // box top-left  (gap 230–370)
      { x1: 370, y1: 160, x2: 440, y2: 160 },  // box top-right
      // guard wall below — same as before
      { x1: 0,   y1: 600, x2: 240, y2: 600 },
      { x1: 360, y1: 600, x2: 600, y2: 600 },
    ],
  },

  {
    // Angled chicane: two diagonal deflectors across the fairway.
    id: 3, name: 'Deflectors', par: 3,
    ballStart: { x: 100, y: 800 },
    hole:      { x: 500, y: 120 },
    walls: [
      { x1: 80,  y1: 620, x2: 360, y2: 500 },  // angled deflector 1
      { x1: 240, y1: 400, x2: 520, y2: 280 },  // angled deflector 2
      { x1: 0,   y1: 500, x2: 80,  y2: 500 },  // left guard
    ],
  },

  {
    // Narrow corridor: two long walls create a 120 px slot to thread.
    id: 4, name: 'The Corridor', par: 3,
    ballStart: { x: 100, y: 800 },
    hole:      { x: 500, y: 100 },
    walls: [
      { x1: 240, y1: 200, x2: 240, y2: 740 },  // left corridor wall
      { x1: 360, y1: 200, x2: 360, y2: 740 },  // right corridor wall
      // side guard left of corridor
      { x1: 0,   y1: 540, x2: 240, y2: 540 },
    ],
  },

  {
    // L-corner: sharp L-turn blocked by two walls meeting at an inside corner.
    id: 5, name: 'Sharp Turn', par: 3,
    ballStart: { x: 500, y: 800 },
    hole:      { x: 100, y: 120 },
    walls: [
      { x1: 0,   y1: 500, x2: 380, y2: 500 },  // horizontal, gap right (380–600)
      { x1: 200, y1: 160, x2: 200, y2: 500 },  // vertical, connects into horizontal
      { x1: 0,   y1: 300, x2: 200, y2: 300 },  // second horizontal above, gap right
    ],
  },

  {
    // Four-layer slalom with tight alternating gaps.
    id: 6, name: 'Slalom', par: 4,
    ballStart: { x: 300, y: 840 },
    hole:      { x: 300, y:  60 },
    walls: [
      { x1: 200, y1: 700, x2: 600, y2: 700 },  // gap at left (0–200)
      { x1: 0,   y1: 540, x2: 400, y2: 540 },  // gap at right (400–600)
      { x1: 200, y1: 380, x2: 600, y2: 380 },  // gap at left (0–200)
      { x1: 0,   y1: 220, x2: 400, y2: 220 },  // gap at right (400–600)
    ],
  },

  {
    // Labyrinth: alternating walls with a vertical post adding a second obstacle.
    id: 7, name: 'Maze Wall', par: 4,
    ballStart: { x: 100, y: 820 },
    hole:      { x: 500, y: 100 },
    walls: [
      { x1: 0,   y1: 660, x2: 400, y2: 660 },  // barrier 1, gap right
      { x1: 200, y1: 480, x2: 600, y2: 480 },  // barrier 2, gap left
      { x1: 0,   y1: 300, x2: 380, y2: 300 },  // barrier 3, gap right
      { x1: 440, y1: 140, x2: 440, y2: 300 },  // vertical guard near hole
    ],
  },

  {
    // Twin posts: two vertical barriers create three lanes, only outer two usable.
    id: 8, name: 'Twin Posts', par: 3,
    ballStart: { x: 300, y: 800 },
    hole:      { x: 300, y: 120 },
    walls: [
      { x1: 160, y1: 260, x2: 160, y2: 600 },  // left post
      { x1: 440, y1: 260, x2: 440, y2: 600 },  // right post
      // horizontal baffles that block the outer lanes midway
      { x1: 0,   y1: 460, x2: 160, y2: 460 },  // outer-left baffle
      { x1: 440, y1: 460, x2: 600, y2: 460 },  // outer-right baffle
    ],
  },

  {
    // Crossroads: perpendicular walls with the hole in a corner pocket.
    id: 9, name: 'Crossroads', par: 4,
    ballStart: { x: 500, y: 800 },
    hole:      { x: 100, y: 140 },
    walls: [
      { x1: 0,   y1: 540, x2: 460, y2: 540 },  // horizontal, gap right (460–600)
      { x1: 240, y1: 180, x2: 240, y2: 540 },  // vertical, gap above at hole side
      { x1: 0,   y1: 360, x2: 240, y2: 360 },  // short left barrier
      { x1: 460, y1: 360, x2: 600, y2: 360 },  // short right barrier
    ],
  },

  {
    // Diamond guard: four walls forming a diamond around center of course.
    id: 10, name: 'Diamond Block', par: 4,
    ballStart: { x: 300, y: 820 },
    hole:      { x: 300, y:  80 },
    walls: [
      { x1: 300, y1: 560, x2: 480, y2: 420 },  // right-down edge
      { x1: 300, y1: 560, x2: 120, y2: 420 },  // left-down edge
      { x1: 120, y1: 420, x2: 300, y2: 280 },  // left-up edge
      { x1: 300, y1: 280, x2: 480, y2: 420 },  // right-up edge (closing diamond)
      // ball must go around diamond; extra guard at top
      { x1: 0,   y1: 200, x2: 240, y2: 200 },
      { x1: 360, y1: 200, x2: 600, y2: 200 },
    ],
  },

  {
    // Pinwheel: four angled walls radiating from center create gaps to thread.
    id: 11, name: 'Pinwheel', par: 4,
    ballStart: { x: 100, y: 800 },
    hole:      { x: 500, y: 120 },
    walls: [
      { x1: 300, y1: 600, x2: 480, y2: 480 },  // bottom-right spoke
      { x1: 300, y1: 600, x2: 120, y2: 480 },  // bottom-left spoke
      { x1: 120, y1: 480, x2: 300, y2: 360 },  // top-left spoke
      { x1: 480, y1: 480, x2: 300, y2: 360 },  // top-right spoke
    ],
  },

  {
    // Nested boxes: two concentric boxes.
    // Outer bottom gap 260–340 (80 px). Inner walls pulled in to x=180/x=420
    // giving 60 px side passages (outer 120↔inner 180) so ball can navigate around.
    id: 12, name: 'Nested', par: 4,
    ballStart: { x: 300, y: 820 },
    hole:      { x: 300, y: 200 },
    walls: [
      // outer box (gap at bottom, 260–340)
      { x1: 120, y1: 540, x2: 260, y2: 540 },
      { x1: 340, y1: 540, x2: 480, y2: 540 },
      { x1: 120, y1: 140, x2: 120, y2: 540 },
      { x1: 480, y1: 140, x2: 480, y2: 540 },
      { x1: 120, y1: 140, x2: 480, y2: 140 },
      // inner box — wider passages: x=180 & x=420 (was 200/400)
      { x1: 180, y1: 420, x2: 420, y2: 420 },
      { x1: 180, y1: 250, x2: 180, y2: 420 },
      { x1: 420, y1: 250, x2: 420, y2: 420 },
      { x1: 180, y1: 250, x2: 240, y2: 250 },  // top-left (gap 240–360)
      { x1: 360, y1: 250, x2: 420, y2: 250 },  // top-right
    ],
  },

  {
    // Split decision: two possible routes, both require precision.
    id: 13, name: 'Split Path', par: 4,
    ballStart: { x: 300, y: 820 },
    hole:      { x: 300, y: 100 },
    walls: [
      // divider post from bottom to mid
      { x1: 300, y1: 480, x2: 300, y2: 720 },
      // left route block
      { x1: 0,   y1: 360, x2: 220, y2: 360 },
      // right route block
      { x1: 380, y1: 360, x2: 600, y2: 360 },
      // top funnel to hole
      { x1: 0,   y1: 200, x2: 220, y2: 200 },
      { x1: 380, y1: 200, x2: 600, y2: 200 },
    ],
  },

  {
    // Grand canyon: four horizontal barriers with alternating left/right gaps.
    // Ball snakes up the fairway — each barrier forces a lane change.
    // No straight-line trivial shot exists (barrier 2 blocks at x≈256 on a direct path).
    id: 14, name: 'Grand Canyon', par: 4,
    ballStart: { x: 100, y: 820 },
    hole:      { x: 500, y: 100 },
    walls: [
      { x1: 200, y1: 700, x2: 600, y2: 700 },  // barrier 1 gap left  (0–200)
      { x1: 0,   y1: 540, x2: 400, y2: 540 },  // barrier 2 gap right (400–600)
      { x1: 200, y1: 380, x2: 600, y2: 380 },  // barrier 3 gap left  (0–200)
      { x1: 0,   y1: 220, x2: 440, y2: 220 },  // barrier 4 gap right (440–600)
    ],
  },

  {
    // Ultimate: 5 walls in complex arrangement — longest puzzle.
    id: 15, name: 'Gauntlet', par: 5,
    ballStart: { x: 100, y: 840 },
    hole:      { x: 500, y: 100 },
    walls: [
      { x1: 260, y1: 720, x2: 600, y2: 720 },  // barrier 1, gap left (0–260)
      { x1: 0,   y1: 560, x2: 380, y2: 560 },  // barrier 2, gap right (380–600)
      { x1: 180, y1: 400, x2: 600, y2: 400 },  // barrier 3, gap left (0–180)
      { x1: 100, y1: 220, x2: 100, y2: 560 },  // vertical left guard
      { x1: 420, y1: 140, x2: 420, y2: 400 },  // vertical right guard near hole
    ],
  },
];
