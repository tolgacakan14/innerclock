export type ObstType = 'low' | 'high' | 'gap';

export interface GrandmaPattern {
  id:       number;
  name:     string;
  /** Looping obstacle-type sequence */
  sequence: ObstType[];
  /** Base pixel gap between obstacle centres at base speed */
  baseGap:  number;
  /** +/- randomness added to each gap */
  variance: number;
  /** Hot Mode flag — triggers extreme visual + speed effects */
  isHot?:          boolean;
  /** Multiplied on top of BASE_SPEED × level multiplier */
  speedMultiplier?: number;
}

/**
 * 15 meaningfully different obstacle patterns.
 *
 * Each pattern has a distinct rhythm: some are jump-heavy, some crouch-heavy,
 * some gap-focused, and some mixed. Difficulty scales with speed levels, not
 * base pattern complexity — all patterns are playable from the beginning.
 *
 * Gap obstacles use wider baseGap (~400–440 px) to give reaction time.
 */
export const grandmaPatterns: GrandmaPattern[] = [

  // ── 1. Flat & Spaced — gentle jump-only intro ────────────────────────────
  { id:  1, name: 'Flat Starter',
    sequence: ['low', 'low', 'low', 'low'],
    baseGap: 410, variance: 65 },

  // ── 2. Crouch Heaven — overhead bars only ────────────────────────────────
  { id:  2, name: 'Low Ceiling',
    sequence: ['high', 'high', 'high', 'high'],
    baseGap: 385, variance: 60 },

  // ── 3. Gap World — consecutive pits ──────────────────────────────────────
  { id:  3, name: 'Gap World',
    sequence: ['gap', 'gap', 'gap'],
    baseGap: 440, variance: 55 },

  // ── 4. Alternating — jump-duck rhythm ────────────────────────────────────
  { id:  4, name: 'Jump-Duck',
    sequence: ['low', 'high', 'low', 'high'],
    baseGap: 360, variance: 55 },

  // ── 5. Leap of Faith — jump then gap ─────────────────────────────────────
  { id:  5, name: 'Leap of Faith',
    sequence: ['low', 'gap', 'low', 'gap'],
    baseGap: 415, variance: 60 },

  // ── 6. Duck-Gap — crouch then void ───────────────────────────────────────
  { id:  6, name: 'Duck & Gap',
    sequence: ['high', 'gap', 'high', 'gap'],
    baseGap: 420, variance: 55 },

  // ── 7. Triple Jump — burst of three low obstacles ────────────────────────
  { id:  7, name: 'Triple Jump',
    sequence: ['low', 'low', 'low', 'high'],
    baseGap: 355, variance: 50 },

  // ── 8. Overhead Cluster — burst of ceiling bars ──────────────────────────
  { id:  8, name: 'Overhead Cluster',
    sequence: ['high', 'high', 'high', 'low'],
    baseGap: 355, variance: 50 },

  // ── 9. Pit Stop — low-gap-high sandwich ──────────────────────────────────
  { id:  9, name: 'Pit Stop',
    sequence: ['low', 'gap', 'high', 'low'],
    baseGap: 400, variance: 60 },

  // ── 10. Zigzag — tight alternating ───────────────────────────────────────
  { id: 10, name: 'Zigzag',
    sequence: ['low', 'high', 'low', 'high', 'low'],
    baseGap: 348, variance: 48 },

  // ── 11. Wave — paired same, then flip ────────────────────────────────────
  { id: 11, name: 'Wave',
    sequence: ['low', 'low', 'high', 'high'],
    baseGap: 345, variance: 52 },

  // ── 12. Crevasse Run — gaps with low crates between ──────────────────────
  { id: 12, name: 'Crevasse Run',
    sequence: ['gap', 'low', 'gap', 'high'],
    baseGap: 405, variance: 58 },

  // ── 13. Platform Drop — safe stretch then a cluster ──────────────────────
  { id: 13, name: 'Platform Drop',
    sequence: ['low', 'high', 'low', 'low', 'high', 'low'],
    baseGap: 370, variance: 55 },

  // ── 14. Narrow Timing — short gaps, fast rhythm ──────────────────────────
  { id: 14, name: 'Narrow Timing',
    sequence: ['low', 'gap', 'high', 'low', 'gap'],
    baseGap: 395, variance: 50 },

  // ── 15. Mixed Advanced — everything in sequence ──────────────────────────
  { id: 15, name: 'Gauntlet',
    sequence: ['low', 'high', 'gap', 'high', 'low', 'gap', 'low'],
    baseGap: 390, variance: 55 },

  // ── 17. Bunny Hop — three quick lows then breathe ────────────────────────
  { id: 17, name: 'Bunny Hop',
    sequence: ['low', 'low', 'low', 'gap'],
    baseGap: 370, variance: 45 },

  // ── 18. Tunnel Rush — ceiling after every gap ────────────────────────────
  { id: 18, name: 'Tunnel Rush',
    sequence: ['gap', 'high', 'gap', 'high', 'low'],
    baseGap: 410, variance: 58 },

  // ── 19. Low Rider — five consecutive crouch bars ─────────────────────────
  { id: 19, name: 'Low Rider',
    sequence: ['high', 'high', 'high', 'high', 'high', 'low'],
    baseGap: 360, variance: 42 },

  // ── 20. Staircase — ascending pairs ──────────────────────────────────────
  { id: 20, name: 'Staircase',
    sequence: ['low', 'low', 'high', 'high', 'gap'],
    baseGap: 375, variance: 52 },

  // ── 21. Canyon — gap between two lows ────────────────────────────────────
  { id: 21, name: 'Canyon',
    sequence: ['low', 'gap', 'low', 'high', 'gap'],
    baseGap: 420, variance: 55 },

  // ── 22. Dizzy — reverse alternating, gap break ───────────────────────────
  { id: 22, name: 'Dizzy',
    sequence: ['high', 'low', 'high', 'low', 'gap', 'high'],
    baseGap: 358, variance: 48 },

  // ── 23. Sprint — dense lows, tight gaps ──────────────────────────────────
  { id: 23, name: 'Sprint',
    sequence: ['low', 'low', 'high', 'low', 'low'],
    baseGap: 338, variance: 38 },

  // ── 24. The Pit — double gap no pause ────────────────────────────────────
  { id: 24, name: 'The Pit',
    sequence: ['gap', 'gap', 'high', 'low', 'gap'],
    baseGap: 435, variance: 52 },

  // ── 25. Echo — pairs mirrored ────────────────────────────────────────────
  { id: 25, name: 'Echo',
    sequence: ['low', 'high', 'low', 'gap', 'low', 'high'],
    baseGap: 368, variance: 52 },

  // ── 26. Cross Winds — gap-low-high triplet loop ──────────────────────────
  { id: 26, name: 'Cross Winds',
    sequence: ['gap', 'low', 'high', 'gap', 'low', 'high'],
    baseGap: 395, variance: 50 },

  // ── 27. Hurdle City — lots of lows, one pit ──────────────────────────────
  { id: 27, name: 'Hurdle City',
    sequence: ['low', 'low', 'low', 'gap', 'low', 'low'],
    baseGap: 350, variance: 45 },

  // ── 28. Duck Hunt — bursts of two ceilings ───────────────────────────────
  { id: 28, name: 'Duck Hunt',
    sequence: ['high', 'high', 'low', 'high', 'high', 'gap'],
    baseGap: 352, variance: 44 },

  // ── 29. Freefall — gap heavy with intervening bars ───────────────────────
  { id: 29, name: 'Freefall',
    sequence: ['gap', 'low', 'gap', 'low', 'high'],
    baseGap: 418, variance: 58 },

  // ── 30. Marathon — long mixed cycle ──────────────────────────────────────
  { id: 30, name: 'Marathon',
    sequence: ['low', 'high', 'low', 'high', 'low', 'gap', 'high', 'low'],
    baseGap: 365, variance: 50 },

  // ── 31. Switchback — gap-high-gap-low-high alternating ───────────────────
  { id: 31, name: 'Switchback',
    sequence: ['high', 'gap', 'low', 'gap', 'high', 'low', 'gap'],
    baseGap: 400, variance: 55 },

  // ── 16. Hot Mode — extreme 2× speed challenge ────────────────────────────
  { id: 16, name: 'Hot Mode',
    sequence: ['low', 'high', 'gap', 'low', 'high', 'gap', 'low', 'high'],
    baseGap: 252, variance: 22,
    isHot: true, speedMultiplier: 2 },
];
