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
];
