/// <reference types="vite/client" />
import type { TargetColor, RoomContext } from './types';

// ── Seeded RNG ────────────────────────────────────────────────────────────────

/** Mulberry32 — fast 32-bit seeded PRNG. Returns values in [0, 1). */
function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string → uint32 hash. */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
}

/**
 * Returns a deterministic RNG for room play, or Math.random for solo.
 * All players in the same room + round + mode get identical content.
 *
 * @param roomContext - RoomContext when inside a multiplayer room, undefined for solo
 * @param mode        - game mode string e.g. 'golf', 'time', 'grandma' …
 */
export function makeGameRng(
  roomContext: RoomContext | undefined,
  mode: string,
): () => number {
  if (!roomContext) return Math.random;
  const key = `${roomContext.roomId}:${roomContext.roundId ?? roomContext.roundNumber ?? '0'}:${mode}`;
  return mulberry32(hashStr(key));
}

/**
 * Returns a deterministic RNG for Daily Challenge mode.
 * All players who play the same mode on the same UTC day get identical content —
 * same golf holes, same grandma patterns, same color targets, same time durations.
 *
 * @param mode    - game mode string (e.g. 'golf', 'time')
 * @param dateStr - override date (YYYY-MM-DD); defaults to today's UTC date
 */
export function makeDailyRng(mode: string, dateStr?: string): () => number {
  const today = dateStr ?? new Date().toISOString().split('T')[0];
  const key   = `daily:${today}:${mode}`;
  return mulberry32(hashStr(key));
}

// ── Time mode ────────────────────────────────────────────────────────────────

/**
 * Piecewise-linear time score 0–100 based on absolute timing error (seconds).
 *
 *  error ≤ 0.05 s  → 100
 *  error ≤ 0.15 s  → 95–99
 *  error ≤ 0.30 s  → 85–94
 *  error ≤ 0.60 s  → 65–84
 *  error ≤ 1.00 s  → 40–64
 *  error ≤ 1.50 s  → 15–39
 *  error >  1.50 s → 0–14 (clamped to 0)
 */
export function calcScore(error: number): number {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  let raw: number;
  if      (error <= 0.05) raw = 100;
  else if (error <= 0.15) raw = lerp(99, 95, (error - 0.05) / 0.10);
  else if (error <= 0.30) raw = lerp(94, 85, (error - 0.15) / 0.15);
  else if (error <= 0.60) raw = lerp(84, 65, (error - 0.30) / 0.30);
  else if (error <= 1.00) raw = lerp(64, 40, (error - 0.60) / 0.40);
  else if (error <= 1.50) raw = lerp(39, 15, (error - 1.00) / 0.50);
  else                    raw = Math.max(0, lerp(14, 0, (error - 1.50) / 0.50));
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ── Rush Mode scoring ─────────────────────────────────────────────────────────

/**
 * Convert raw tap count → score out of 500.
 *   100 taps = 500 / 500 (perfect)
 *   50  taps = 250 / 500
 *   30  taps = 150 / 500
 * Clamped so you can never exceed 500.
 */
export function calcRushScore(taps: number): number {
  return Math.round(Math.min(taps / 100, 1) * 500);
}

// Hidden target duration 1.5–7.0 s, one decimal place
export function randomTarget(rng: () => number = Math.random): number {
  return Math.round((rng() * 5.5 + 1.5) * 10) / 10;
}

// ── Color mode — random target ────────────────────────────────────────────────

/**
 * Returns true if the HSL color is perceptually light (WCAG relative luminance > 0.179).
 * Use this to decide whether dark or light text is legible over the color.
 */
export function isColorLight(h: number, s: number, l: number): boolean {
  const [, y] = rgbToXyz(...hslToRgb(h, s, l));
  return y > 0.179;
}

// Generate a visually rich, non-muddy HSL color
export function randomColor(): TargetColor {
  return {
    h: Math.round(Math.random() * 360),
    s: Math.round(Math.random() * 40 + 45),  // 45–85 — vivid but not garish
    l: Math.round(Math.random() * 35 + 35),  // 35–70 — not too dark or pale
  };
}

// ── Diverse color set ─────────────────────────────────────────────────────────

type ColorCategory = { name: string; s: [number, number]; l: [number, number] };

const COLOR_CATEGORIES: ColorCategory[] = [
  { name: 'Vibrant', s: [75, 100], l: [42, 62] },
  { name: 'Deep',    s: [55,  90], l: [22, 42] },
  { name: 'Soft',    s: [35,  70], l: [62, 80] },
  { name: 'Muted',   s: [25,  55], l: [35, 65] },
  { name: 'Bright',  s: [65, 100], l: [55, 72] },
];

function rng(min: number, max: number, rand: () => number = Math.random): number {
  return Math.round(rand() * (max - min) + min);
}

/**
 * Generate `count` target colors with:
 *  - hues spread evenly across the full wheel (slot-based + jitter)
 *  - enforced minimum 30° hue gap between adjacent rounds
 *  - one shuffled visual category per slot (Vibrant/Deep/Soft/Muted/Bright)
 *  - dev-mode logging of HSL + category per round
 */
export function generateDiverseColorSet(count: number, rand: () => number = Math.random): TargetColor[] {
  const slotSize  = 360 / count;
  const hueOffset = rand() * 360;

  // Shuffle categories so we don't always start with the same one
  const cats = [...COLOR_CATEGORIES];
  for (let i = cats.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cats[i], cats[j]] = [cats[j], cats[i]];
  }

  const colors: TargetColor[] = [];

  for (let i = 0; i < count; i++) {
    const cat    = cats[i % cats.length];
    const centre = (hueOffset + i * slotSize) % 360;
    let   h      = Math.round((centre + (rand() - 0.5) * slotSize * 0.7 + 360) % 360);

    // Enforce ≥ 30° hue gap from the previous color when saturation is similar
    if (colors.length > 0) {
      const prev     = colors[colors.length - 1];
      const raw      = Math.abs(h - prev.h);
      const circDiff = Math.min(raw, 360 - raw);
      if (circDiff < 30) {
        h = Math.round((h + 40 + 360) % 360);
      }
    }

    colors.push({ h, s: rng(cat.s[0], cat.s[1], rand), l: rng(cat.l[0], cat.l[1], rand) });
  }

  if (import.meta.env.DEV) {
    console.group('%c🎨 Color Mode — target colors generated', 'font-weight:bold;color:#c0a0f8');
    colors.forEach((c, i) => {
      const catName = cats[i % cats.length].name;
      console.log(`  Round ${i + 1} [${catName}]:`,
        `hsl(${c.h}, ${c.s}%, ${c.l}%)`,
        `— H:${c.h}  S:${c.s}  L:${c.l}`);
    });
    console.groupEnd();
  }

  return colors;
}

// ── Color space conversions ───────────────────────────────────────────────────

/**
 * HSL (h 0–360, s 0–100, l 0–100) → sRGB (0–255 each).
 * Uses the standard CSS HSL algorithm.
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100;
  const ln = l / 100;
  const a  = sn * Math.min(ln, 1 - ln);
  const f  = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

/**
 * Linearise one sRGB channel (0–1) by removing gamma encoding (IEC 61966-2-1).
 */
function srgbLinearise(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * sRGB (0–255 each) → CIE XYZ D65 using the standard IEC 61966-2-1 matrix.
 */
export function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const rl = srgbLinearise(r / 255);
  const gl = srgbLinearise(g / 255);
  const bl = srgbLinearise(b / 255);
  return [
    rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375,
    rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750,
    rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041,
  ];
}

/**
 * CIE XYZ D65 → CIELAB.
 * D65 reference white (CIE 1931 2° observer): X=0.95047, Y=1.00000, Z=1.08883.
 */
function labF(t: number): number {
  // Standard linearisation threshold ε = (6/29)³ ≈ 0.008856
  return t > 0.008856 ? t ** (1 / 3) : 7.787037 * t + 16 / 116;
}
export function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const fx = labF(x / 0.95047);
  const fy = labF(y / 1.00000);
  const fz = labF(z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// ── CIEDE2000 ─────────────────────────────────────────────────────────────────

const DEG2RAD  = Math.PI / 180;
const RAD2DEG  = 180 / Math.PI;
const POW25_7  = 25 ** 7;   // 6,103,515,625

/** atan2 in degrees mapped to [0, 360). */
function atan2d(y: number, x: number): number {
  const a = Math.atan2(y, x) * RAD2DEG;
  return a < 0 ? a + 360 : a;
}

/**
 * CIEDE2000 perceptual color difference between two CIELAB values.
 *
 * Reference: G. Sharma, W. Wu, E.N. Dalal,
 * "The CIEDE2000 Color-Difference Formula: Implementation Notes,
 *  Supplementary Test Data, and Mathematical Observations",
 *  Color Research & Application 30(1), 2005.
 *
 * Typical perceptual thresholds:
 *   < 1    — imperceptible
 *   1–2    — barely perceptible
 *   2–10   — clearly perceptible
 *   10–50  — strong difference
 *   50+    — completely different
 */
export function deltaE2000(
  [L1, a1, b1]: [number, number, number],
  [L2, a2, b2]: [number, number, number],
): number {
  // ── Step 1: Adjusted a* using G factor ──────────────────────────────────
  const C1  = Math.sqrt(a1 ** 2 + b1 ** 2);
  const C2  = Math.sqrt(a2 ** 2 + b2 ** 2);
  const Cb  = (C1 + C2) / 2;
  const Cb7 = Cb ** 7;
  const G   = 0.5 * (1 - Math.sqrt(Cb7 / (Cb7 + POW25_7)));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  // ── Step 2: Adjusted C', h' ─────────────────────────────────────────────
  const C1p = Math.sqrt(a1p ** 2 + b1 ** 2);
  const C2p = Math.sqrt(a2p ** 2 + b2 ** 2);
  const h1p = atan2d(b1, a1p);
  const h2p = atan2d(b2, a2p);

  // ── Step 3: ΔL', ΔC', Δh', ΔH' ─────────────────────────────────────────
  const dLp  = L2 - L1;
  const dCp  = C2p - C1p;
  const zero = C1p * C2p === 0;
  const rawDh = h2p - h1p;
  const dhp   = zero               ? 0
    : Math.abs(rawDh) <= 180 ? rawDh
    : rawDh > 180             ? rawDh - 360
    :                           rawDh + 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * DEG2RAD);

  // ── Step 4: Mean L̄', C̄', h̄' ────────────────────────────────────────────
  const Lbp  = (L1 + L2) / 2;
  const Cbp  = (C1p + C2p) / 2;
  const sumH = h1p + h2p;
  const hbp  = zero                         ? sumH
    : Math.abs(h1p - h2p) <= 180 ? sumH / 2
    : sumH < 360                  ? (sumH + 360) / 2
    :                               (sumH - 360) / 2;

  // ── Step 5: Hue weighting T ─────────────────────────────────────────────
  const T = 1
    - 0.17 * Math.cos((hbp - 30)     * DEG2RAD)
    + 0.24 * Math.cos(2 * hbp         * DEG2RAD)
    + 0.32 * Math.cos((3 * hbp + 6)  * DEG2RAD)
    - 0.20 * Math.cos((4 * hbp - 63) * DEG2RAD);

  // ── Step 6: Weighting functions SL, SC, SH ──────────────────────────────
  const Lbp2 = (Lbp - 50) ** 2;
  const SL   = 1 + 0.015 * Lbp2 / Math.sqrt(20 + Lbp2);
  const SC   = 1 + 0.045 * Cbp;
  const SH   = 1 + 0.015 * Cbp * T;

  // ── Step 7: Blue-hue rotation RT ────────────────────────────────────────
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Cbp7   = Cbp ** 7;
  const RC     = 2 * Math.sqrt(Cbp7 / (Cbp7 + POW25_7));
  const RT     = -Math.sin(2 * dTheta * DEG2RAD) * RC;

  // ── Final CIEDE2000 ─────────────────────────────────────────────────────
  return Math.sqrt(
    (dLp / SL) ** 2 +
    (dCp / SC) ** 2 +
    (dHp / SH) ** 2 +
    RT * (dCp / SC) * (dHp / SH),
  );
}

// ── Piecewise scoring ─────────────────────────────────────────────────────────

/**
 * Map CIEDE2000 Delta E to a player-friendly score 0–100.
 *
 * Generous curve tuned for perceived fairness:
 *
 *  ΔE range     | Score range  | Perceptual meaning
 *  -------------+--------------+-----------------------------------
 *   0.0 –  1.0  | 100 → 97     | Nearly identical
 *   1.0 –  4.0  |  97 → 88     | Very close
 *   4.0 –  8.0  |  88 → 78     | Close but noticeable
 *   8.0 – 18.0  |  78 → 58     | Moderate difference
 *  18.0 – 32.0  |  58 → 30     | Clearly different
 *  32.0 – 50.0  |  30 → 10     | Very different
 *  50.0 – 70.0  |  10 →  0     | Completely different
 *  70.0+         |   0          | Maximum mismatch
 */
function scoreFromDeltaE(de: number): number {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  let raw: number;
  if      (de <=  1) raw = lerp(100, 97, de /  1.0);
  else if (de <=  4) raw = lerp( 97, 88, (de -  1) /  3.0);
  else if (de <=  8) raw = lerp( 88, 78, (de -  4) /  4.0);
  else if (de <= 18) raw = lerp( 78, 58, (de -  8) / 10.0);
  else if (de <= 32) raw = lerp( 58, 30, (de - 18) / 14.0);
  else if (de <= 50) raw = lerp( 30, 10, (de - 32) / 18.0);
  else if (de <= 70) raw = lerp( 10,  0, (de - 50) / 20.0);
  else               raw = 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Compare two HSL colors using CIEDE2000 → returns { deltaE, score 0–100 }.
 * In development mode, logs the full conversion pipeline to the console for
 * debugging and calibration purposes.
 */
export function calcColorScore(
  target:   TargetColor,
  selected: TargetColor,
): { deltaE: number; score: number } {
  const rgb1 = hslToRgb(target.h,   target.s,   target.l);
  const rgb2 = hslToRgb(selected.h, selected.s, selected.l);
  const lab1 = xyzToLab(...rgbToXyz(...rgb1));
  const lab2 = xyzToLab(...rgbToXyz(...rgb2));
  const de   = deltaE2000(lab1, lab2);
  const score = scoreFromDeltaE(de);

  if (import.meta.env.DEV) {
    console.group('%c🎨 Krone — Color Score', 'font-weight:bold;color:#a0a0a8');
    console.log('Target  HSL :', `hsl(${target.h}, ${target.s}%, ${target.l}%)`);
    console.log('User    HSL :', `hsl(${selected.h}, ${selected.s}%, ${selected.l}%)`);
    console.log('Target  RGB :', rgb1);
    console.log('User    RGB :', rgb2);
    console.log('Target  Lab :', lab1.map(v => +v.toFixed(3)));
    console.log('User    Lab :', lab2.map(v => +v.toFixed(3)));
    console.log('ΔE 2000     :', +de.toFixed(2));
    console.log('Score       :', score, '/ 100');
    console.groupEnd();
  }

  return { deltaE: de, score };
}
