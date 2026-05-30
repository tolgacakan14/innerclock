import { useEffect, useRef, useState } from 'react';
import type { GrandmaPattern } from '../data/grandmaPatterns';

// ── Canvas / world constants ──────────────────────────────────────────────────
const CW         = 800;   // canvas logical width
const CH         = 380;   // canvas logical height
const GROUND_Y   = 310;   // y of ground surface (feet stand here)
const CHAR_X     = 130;   // fixed horizontal position

// Character hitbox half-extents
const CHAR_HW_STAND  = 12;   // half-width standing
const CHAR_H_STAND   = 68;   // height standing
const CHAR_HW_CROUCH = 18;   // half-width crouching
const CHAR_H_CROUCH  = 36;   // height crouching

// Obstacle dimensions
const OBS_W    = 32;
const LOW_H    = 48;              // low obstacle height
const HIGH_TOP = GROUND_Y - 110; // top of hanging obstacle
const HIGH_BOT = GROUND_Y - 50;  // bottom of hanging obstacle
const GAP_W    = 90;             // gap (hole) width in pixels

// Physics — tuned for comfort + gap clearance
const JUMP_VY  = -13.5;  // strong upward impulse
const GRAVITY  = 0.52;   // gentle gravity for float time
const COYOTE_F = 5;      // coyote-time frames (~83 ms @ 60 fps)
const BUFFER_F = 5;      // jump-buffer frames
const BASE_SPEED = 3.0;  // px/frame at 60 fps
const DEATH_MS   = 1000; // death animation duration

// ── Speed levels ─────────────────────────────────────────────────────────────
//   0–5 s   Beginner    1.00×
//   5–10 s  Adapte      1.30×
//   10–20 s Normal      1.65×
//   20–30 s Back to 20s 2.05×
//   30–40 s Menopause   2.50×
//   40–50 s Last Dance  3.00×
//   50+ s   Virgin Mode 3.60×
const SPEED_LEVELS = [
  { name: 'Beginner',    multiplier: 1.00, minTime:  0 },
  { name: 'Adapte',      multiplier: 1.30, minTime:  5 },
  { name: 'Normal',      multiplier: 1.65, minTime: 10 },
  { name: 'Back to 20s', multiplier: 2.05, minTime: 20 },
  { name: 'Menopause',   multiplier: 2.50, minTime: 30 },
  { name: 'Last Dance',  multiplier: 3.00, minTime: 40 },
  { name: 'Virgin Mode', multiplier: 3.60, minTime: 50 },
] as const;

// Speed lerp factor — controls how quickly currentSpeed transitions to targetSpeed
// ~0.04 gives ≈95% of target in ~1.1s at 60fps
const LERP_F = 0.04;

type LevelName = typeof SPEED_LEVELS[number]['name'];

// Chaser sync delay — ring buffer size (8 frames ≈ 133 ms at 60 fps)
const HIST = 8;

// ── Obstacle ──────────────────────────────────────────────────────────────────
interface Obstacle { id: number; x: number; type: 'low' | 'high' | 'gap'; }

// ── Pre-defined parallax star/shape positions ─────────────────────────────────
const STARS = [
  {tx:  8, ty:  28}, {tx: 42, ty:  62}, {tx: 20, ty: 105},
  {tx: 50, ty: 148}, {tx:  5, ty: 190}, {tx: 35, ty:  85},
  {tx: 22, ty: 220}, {tx: 48, ty: 250}, {tx: 12, ty: 170},
  {tx: 38, ty:  40}, {tx: 28, ty: 130}, {tx: 52, ty: 200},
];
const STAR_TILE = 56;

// Far-background silhouette buildings
const BUILDINGS = [
  { bx: 0,   bw: 80,  bh: 80  },
  { bx: 90,  bw: 60,  bh: 110 },
  { bx: 160, bw: 100, bh: 65  },
  { bx: 270, bw: 70,  bh: 95  },
  { bx: 350, bw: 90,  bh: 75  },
  { bx: 450, bw: 65,  bh: 105 },
  { bx: 525, bw: 85,  bh: 60  },
  { bx: 620, bw: 70,  bh: 90  },
  { bx: 700, bw: 90,  bh: 70  },
];
const BLDG_TILE = 800;

// ── Drawing: background ───────────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, scrollDist: number, level: number = 0) {
  // Sky gradient — Virgin Mode gets a subtle purple tint
  const skyTop    = level >= 6 ? '#0A0512' : '#06050F';
  const skyMid    = level >= 6 ? '#130A20' : '#0C0A1A';
  const skyBottom = level >= 6 ? '#1A0E2E' : '#12102A';
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0,   skyTop);
  sky.addColorStop(0.6, skyMid);
  sky.addColorStop(1,   skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, GROUND_Y);

  // Far parallax stars — speed up for high levels
  const farMult = level >= 6 ? 0.18 : level >= 5 ? 0.14 : 0.10;
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  const farOff = scrollDist * farMult % STAR_TILE;
  for (const s of STARS) {
    for (let col = -1; col <= Math.ceil(CW / STAR_TILE) + 1; col++) {
      const x = col * STAR_TILE + s.tx - farOff;
      if (x >= -2 && x <= CW + 2 && s.ty < GROUND_Y - 20) {
        ctx.fillRect(Math.round(x), s.ty, 1.5, 1.5);
      }
    }
  }

  // Mid parallax — distant city silhouette; speed up for high levels
  const midMult = level >= 6 ? 0.38 : level >= 5 ? 0.29 : 0.20;
  ctx.fillStyle = level >= 6 ? 'rgba(22,10,42,0.88)' : 'rgba(18,14,32,0.88)';
  const midOff = scrollDist * midMult % BLDG_TILE;
  for (let rep = -1; rep <= 1; rep++) {
    for (const b of BUILDINGS) {
      const bx = b.bx + rep * BLDG_TILE - midOff;
      if (bx > -120 && bx < CW + 20) {
        ctx.fillRect(Math.round(bx), GROUND_Y - b.bh - 4, b.bw, b.bh);
        // Tiny window dots
        ctx.fillStyle = 'rgba(255,240,180,0.12)';
        for (let wy = GROUND_Y - b.bh + 8; wy < GROUND_Y - 12; wy += 14) {
          for (let wx = bx + 6; wx < bx + b.bw - 6; wx += 12) {
            ctx.fillRect(Math.round(wx), wy, 4, 6);
          }
        }
        ctx.fillStyle = 'rgba(18,14,32,0.88)';
      }
    }
  }

  // Horizon haze
  const haze = ctx.createLinearGradient(0, GROUND_Y - 55, 0, GROUND_Y);
  haze.addColorStop(0, 'rgba(0,0,0,0)');
  haze.addColorStop(1, 'rgba(8,6,20,0.70)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, GROUND_Y - 55, CW, 55);
}

// ── Drawing: ground platform ──────────────────────────────────────────────────
function drawGround(ctx: CanvasRenderingContext2D, scrollDist: number) {
  const platH = 38;

  // Platform body — multi-layer gradient
  const grad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + platH);
  grad.addColorStop(0,   'rgba(62,55,84,0.98)');
  grad.addColorStop(0.3, 'rgba(45,40,60,0.92)');
  grad.addColorStop(0.7, 'rgba(30,26,42,0.88)');
  grad.addColorStop(1,   'rgba(16,14,24,0.80)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, GROUND_Y, CW, platH);

  // Top highlight (bright edge)
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(0, GROUND_Y, CW, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(0, GROUND_Y + 2, CW, 1);

  // Moving tile seams
  const tileW = 96;
  const seamOff = scrollDist % tileW;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let x = -seamOff; x < CW + tileW; x += tileW) {
    ctx.fillRect(Math.round(x), GROUND_Y + 3, 1.5, platH - 8);
  }

  // Subtle reflective sheen in middle of platform
  ctx.fillStyle = 'rgba(120,110,160,0.08)';
  ctx.fillRect(0, GROUND_Y + 8, CW, 6);
}

// ── Drawing: gap holes ────────────────────────────────────────────────────────
function drawGaps(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]) {
  for (const obs of obstacles) {
    if (obs.type !== 'gap') continue;
    const gx = obs.x;

    // Void below ground
    ctx.fillStyle = '#06050F';
    ctx.fillRect(gx, GROUND_Y - 1, GAP_W, CH - GROUND_Y + 10);

    // Dark inner gradient
    const voidGrad = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 60);
    voidGrad.addColorStop(0,   'rgba(0,0,0,0.85)');
    voidGrad.addColorStop(0.5, 'rgba(4,2,12,0.60)');
    voidGrad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = voidGrad;
    ctx.fillRect(gx, GROUND_Y, GAP_W, 60);

    // Left edge cap
    const lEdge = ctx.createLinearGradient(gx, 0, gx + 10, 0);
    lEdge.addColorStop(0, 'rgba(0,0,0,0.55)');
    lEdge.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lEdge;
    ctx.fillRect(gx, GROUND_Y, 10, 38);

    // Right edge cap
    const rEdge = ctx.createLinearGradient(gx + GAP_W - 10, 0, gx + GAP_W, 0);
    rEdge.addColorStop(0, 'rgba(0,0,0,0)');
    rEdge.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = rEdge;
    ctx.fillRect(gx + GAP_W - 10, GROUND_Y, 10, 38);

    // Bright highlight on gap edges (visible rim)
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(gx, GROUND_Y, 2, 28);
    ctx.fillRect(gx + GAP_W - 2, GROUND_Y, 2, 28);
  }
}

// ── Drawing: grandma character ────────────────────────────────────────────────

function drawGrandmaStanding(
  ctx: CanvasRenderingContext2D, cx: number, feetY: number, legPhase: number, airborne = false,
) {
  const sw = airborne ? 0 : Math.sin(legPhase) * 9;
  const bob = airborne ? -4 : Math.abs(Math.sin(legPhase * 0.5)) * 2;

  // Shadow on ground
  if (!airborne) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, feetY + 1, 14, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const ty = -bob; // vertical body offset

  ctx.save();
  ctx.translate(0, ty);

  // Dress
  ctx.fillStyle = 'rgba(200,185,215,0.94)';
  ctx.beginPath();
  ctx.moveTo(cx - 14, feetY);
  ctx.lineTo(cx + 14, feetY);
  ctx.lineTo(cx + 9,  feetY - 38);
  ctx.lineTo(cx - 9,  feetY - 38);
  ctx.closePath();
  ctx.fill();
  // Dress hem crease
  ctx.fillStyle = 'rgba(160,142,182,0.50)';
  ctx.fillRect(cx - 13, feetY - 6, 26, 1.5);
  // Dress side highlight
  ctx.fillStyle = 'rgba(230,220,240,0.30)';
  ctx.fillRect(cx - 8,  feetY - 35, 5, 32);

  // Legs
  ctx.strokeStyle = 'rgba(155,138,168,0.90)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 4, feetY - 12); ctx.lineTo(cx - 10 - sw, feetY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 4, feetY - 12); ctx.lineTo(cx + 10 + sw, feetY); ctx.stroke();

  // Shoes
  ctx.fillStyle = 'rgba(80,68,98,0.92)';
  ctx.beginPath(); ctx.ellipse(cx - 10 - sw, feetY, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 10 + sw, feetY, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Shoe highlight
  ctx.fillStyle = 'rgba(140,120,160,0.30)';
  ctx.beginPath(); ctx.ellipse(cx - 12 - sw, feetY - 1, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 8  + sw, feetY - 1, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();

  // Upper body / blouse
  ctx.fillStyle = 'rgba(232,222,238,0.92)';
  ctx.beginPath();
  ctx.roundRect(cx - 9, feetY - 55, 18, 18, 4);
  ctx.fill();
  // Blouse button
  ctx.fillStyle = 'rgba(190,175,210,0.60)';
  ctx.beginPath(); ctx.arc(cx, feetY - 48, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, feetY - 43, 1.5, 0, Math.PI * 2); ctx.fill();

  // Arms
  const armSwing = airborne ? 8 : Math.sin(legPhase + Math.PI) * 8;
  ctx.strokeStyle = 'rgba(210,178,148,0.85)';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  // Right arm (foreground)
  ctx.beginPath();
  ctx.moveTo(cx + 8, feetY - 52);
  ctx.lineTo(cx + 17 + armSwing, feetY - 40);
  ctx.stroke();
  // Left arm (background, slightly transparent)
  ctx.strokeStyle = 'rgba(190,160,130,0.55)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx - 8, feetY - 52);
  ctx.lineTo(cx - 17 - armSwing, feetY - 40);
  ctx.stroke();

  // Head
  ctx.fillStyle = 'rgba(215,180,150,0.94)';
  ctx.beginPath(); ctx.arc(cx + 1, feetY - 64, 9.5, 0, Math.PI * 2); ctx.fill();
  // Cheek blush
  ctx.fillStyle = 'rgba(240,160,140,0.28)';
  ctx.beginPath(); ctx.arc(cx + 6, feetY - 61, 3.5, 0, Math.PI * 2); ctx.fill();

  // Hair bun
  ctx.fillStyle = 'rgba(210,208,215,0.96)';
  ctx.beginPath(); ctx.arc(cx + 2, feetY - 72, 6, 0, Math.PI * 2); ctx.fill();
  // Bun inner detail
  ctx.fillStyle = 'rgba(185,182,192,0.60)';
  ctx.beginPath(); ctx.arc(cx + 2, feetY - 72, 3.5, 0, Math.PI * 2); ctx.fill();
  // Bun highlight
  ctx.fillStyle = 'rgba(245,243,248,0.60)';
  ctx.beginPath(); ctx.arc(cx, feetY - 74, 2.5, Math.PI, 0); ctx.fill();

  // Glasses
  ctx.strokeStyle = 'rgba(60,55,75,0.78)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(cx - 2,  feetY - 64, 3.4, 2.4, -0.10, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx + 4.5,feetY - 64, 3.4, 2.4, -0.10, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 1.0, feetY - 64); ctx.lineTo(cx + 1.3, feetY - 64); ctx.stroke();
  // Bridge
  ctx.beginPath(); ctx.moveTo(cx - 5.4, feetY - 64); ctx.lineTo(cx - 7.5, feetY - 65); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 7.9, feetY - 64); ctx.lineTo(cx + 10,  feetY - 65); ctx.stroke();

  // Cane
  ctx.strokeStyle = 'rgba(168,150,125,0.85)';
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + 10, feetY - 22); ctx.lineTo(cx + 21, feetY); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + 20, feetY - 3, 3.8, -Math.PI * 0.7, Math.PI * 0.3); ctx.stroke();

  ctx.restore();
}

function drawGrandmaJumping(ctx: CanvasRenderingContext2D, cx: number, feetY: number) {
  ctx.save();
  ctx.translate(cx, feetY);
  ctx.rotate(0.08); // slight forward lean

  // Legs tucked
  ctx.strokeStyle = 'rgba(155,138,168,0.90)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -12); ctx.quadraticCurveTo(-14, -22, -8, -4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( 4, -12); ctx.quadraticCurveTo( 14, -22,  8, -4); ctx.stroke();

  // Shoes
  ctx.fillStyle = 'rgba(80,68,98,0.92)';
  ctx.beginPath(); ctx.ellipse(-8, -5, 5.5, 2.8, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse( 8, -5, 5.5, 2.8, 0.3, 0, Math.PI * 2); ctx.fill();

  // Dress (compressed upward)
  ctx.fillStyle = 'rgba(200,185,215,0.94)';
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.lineTo( 12, -4);
  ctx.lineTo(  8, -36);
  ctx.lineTo( -8, -36);
  ctx.closePath();
  ctx.fill();

  // Upper body
  ctx.fillStyle = 'rgba(232,222,238,0.92)';
  ctx.beginPath(); ctx.roundRect(-8, -52, 16, 17, 4); ctx.fill();

  // Arms raised
  ctx.strokeStyle = 'rgba(210,178,148,0.85)';
  ctx.lineWidth = 4.5;
  ctx.beginPath(); ctx.moveTo( 7, -47); ctx.lineTo( 20, -60); ctx.stroke();
  ctx.strokeStyle = 'rgba(190,160,130,0.55)';
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(-7, -47); ctx.lineTo(-20, -58); ctx.stroke();

  // Head
  ctx.fillStyle = 'rgba(215,180,150,0.94)';
  ctx.beginPath(); ctx.arc(1, -62, 9.5, 0, Math.PI * 2); ctx.fill();

  // Hair bun
  ctx.fillStyle = 'rgba(210,208,215,0.96)';
  ctx.beginPath(); ctx.arc(2, -70, 5.8, 0, Math.PI * 2); ctx.fill();

  // Glasses
  ctx.strokeStyle = 'rgba(60,55,75,0.78)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(-1, -62, 3.4, 2.4, -0.10, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse( 5, -62, 3.4, 2.4, -0.10, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();
}

function drawGrandmaCrouching(ctx: CanvasRenderingContext2D, cx: number, feetY: number) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, feetY + 1, 18, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wide squat dress
  ctx.fillStyle = 'rgba(200,185,215,0.94)';
  ctx.beginPath();
  ctx.moveTo(cx - 20, feetY);
  ctx.lineTo(cx + 20, feetY);
  ctx.lineTo(cx + 12, feetY - 20);
  ctx.lineTo(cx - 12, feetY - 20);
  ctx.closePath();
  ctx.fill();

  // Hunched upper body
  ctx.fillStyle = 'rgba(232,222,238,0.92)';
  ctx.beginPath();
  ctx.ellipse(cx, feetY - 28, 12, 9, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Arms wide
  ctx.strokeStyle = 'rgba(210,178,148,0.85)';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + 10, feetY - 25); ctx.lineTo(cx + 22, feetY - 18); ctx.stroke();
  ctx.strokeStyle = 'rgba(190,160,130,0.55)';
  ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(cx - 10, feetY - 25); ctx.lineTo(cx - 22, feetY - 18); ctx.stroke();

  // Head (lowered, tilted forward)
  ctx.fillStyle = 'rgba(215,180,150,0.94)';
  ctx.beginPath(); ctx.arc(cx + 3, feetY - 37, 8.5, 0, Math.PI * 2); ctx.fill();
  // Cheek blush
  ctx.fillStyle = 'rgba(240,160,140,0.25)';
  ctx.beginPath(); ctx.arc(cx + 8, feetY - 34, 3, 0, Math.PI * 2); ctx.fill();

  // Hair bun
  ctx.fillStyle = 'rgba(210,208,215,0.96)';
  ctx.beginPath(); ctx.arc(cx + 4, feetY - 44, 5.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(185,182,192,0.50)';
  ctx.beginPath(); ctx.arc(cx + 4, feetY - 44, 3, 0, Math.PI * 2); ctx.fill();

  // Glasses
  ctx.strokeStyle = 'rgba(60,55,75,0.78)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(cx,     feetY - 38, 3.2, 2.2, -0.12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx + 6, feetY - 38, 3.2, 2.2, -0.12, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 3.2, feetY - 38); ctx.lineTo(cx + 2.8, feetY - 38); ctx.stroke();
}

function drawGrandmaDying(
  ctx: CanvasRenderingContext2D, cx: number, feetY: number, scale: number, alpha: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, feetY);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -feetY);
  drawGrandmaStanding(ctx, cx, feetY, 0);
  ctx.restore();
}

function drawSplat(ctx: CanvasRenderingContext2D, cx: number, cy: number, progress: number) {
  const outerR = 62 * progress;
  const innerR = 24 * progress;
  const alpha  = Math.sin(progress * Math.PI) * 0.75;
  if (alpha <= 0 || outerR <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Outer starburst
  ctx.fillStyle = 'rgba(205,30,22,0.90)';
  ctx.beginPath();
  const pts = 10;
  for (let i = 0; i < pts * 2; i++) {
    const angle = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    const r     = i % 2 === 0 ? outerR : innerR;
    const x     = cx + Math.cos(angle) * r;
    const y     = cy + Math.sin(angle) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Inner splat circle
  ctx.fillStyle = 'rgba(240,50,40,0.70)';
  ctx.beginPath();
  ctx.arc(cx, cy, innerR * 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Comic stars around splat
  if (progress > 0.3) {
    const sp = (progress - 0.3) / 0.7;
    ctx.fillStyle = `rgba(255,240,60,${sp * 0.85})`;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sr = outerR * 0.7;
      const sx = cx + Math.cos(a) * sr;
      const sy = cy + Math.sin(a) * sr;
      ctx.beginPath();
      ctx.arc(sx, sy, 4 * sp, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ── Drawing: dramatic death (Last Dance + Virgin Mode) ────────────────────────
function drawDramaticDeath(
  ctx: CanvasRenderingContext2D, cx: number, feetY: number, t: number, level: number,
) {
  const isVirgin = level >= 6;

  // ── Body: squash & flatten ──────────────────────────────────────────────────
  if (t < 0.88) {
    const bodyAlpha = t < 0.72 ? 1.0 : 1.0 - (t - 0.72) / 0.16;
    const squashX   = 1.0 + t * 0.55;
    const squashY   = Math.max(0.08, 1.0 - t * 1.10);
    ctx.save();
    ctx.globalAlpha = Math.max(0, bodyAlpha);
    ctx.translate(cx, feetY);
    ctx.scale(squashX, squashY);
    ctx.translate(-cx, -feetY);
    drawGrandmaStanding(ctx, cx, feetY, 0);
    ctx.restore();
  }

  // ── Flying head ────────────────────────────────────────────────────────────
  if (t > 0.04) {
    const ht    = Math.min((t - 0.04) / 0.96, 1);
    const headX = cx + Math.sin(ht * Math.PI * 1.8) * 58;
    const headY = (feetY - 42) - 170 * ht + 290 * ht * ht;   // parabola
    const hAlpha = ht < 0.88 ? 1.0 : 1.0 - (ht - 0.88) / 0.12;
    const hRot   = ht * Math.PI * 2.8;

    ctx.save();
    ctx.globalAlpha = Math.max(0, hAlpha);
    ctx.translate(headX, headY);
    ctx.rotate(hRot);

    // Hair bun
    ctx.fillStyle = '#F0EEF8';
    ctx.beginPath(); ctx.ellipse(0, -12, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#D0CCE0'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-4, -14); ctx.lineTo(-6, -19); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,  -15); ctx.lineTo(0,  -21); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4,  -14); ctx.lineTo(6,  -19); ctx.stroke();

    // Face
    ctx.fillStyle = '#F5C8A0';
    ctx.beginPath(); ctx.arc(0, -2, 10, 0, Math.PI * 2); ctx.fill();

    // Glasses
    ctx.strokeStyle = 'rgba(60,55,75,0.80)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(-3.2, -2.5, 3.2, 2.2, -0.12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse( 3.2, -2.5, 3.2, 2.2, -0.12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.lineTo(0.4, -2.5); ctx.stroke();

    // Shocked open mouth
    ctx.fillStyle = 'rgba(55,25,15,0.82)';
    ctx.beginPath(); ctx.ellipse(0, 3.5, 2.4, 3.2, 0, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  // ── Star burst ─────────────────────────────────────────────────────────────
  if (t > 0.08) {
    const st    = Math.min((t - 0.08) / 0.92, 1);
    const [r, g, b] = isVirgin ? [220, 30, 255] : [255, 195, 40];
    const count = isVirgin ? 10 : 8;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist  = st * 76;
      const sx    = cx + Math.cos(angle) * dist;
      const sy    = (feetY - 32) + Math.sin(angle) * dist * 0.62;
      const sa    = Math.max(0, 1 - st * 1.35);
      const sr    = 5.5 * (1 - st * 0.5);

      ctx.save();
      ctx.globalAlpha = sa;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.translate(sx, sy);
      ctx.rotate(t * 4.5 + i * 0.65);
      ctx.beginPath();
      for (let p = 0; p < 5; p++) {
        const a  = (p / 5) * Math.PI * 2 - Math.PI / 2;
        const a2 = ((p + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
        const ox = Math.cos(a) * sr,  oy = Math.sin(a) * sr;
        const ix = Math.cos(a2) * sr * 0.42, iy = Math.sin(a2) * sr * 0.42;
        if (p === 0) ctx.moveTo(ox, oy); else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // ── KAPOW / BOOM text ──────────────────────────────────────────────────────
  if (t > 0.12 && t < 0.70) {
    const tp        = (t - 0.12) / 0.58;
    const textAlpha = tp < 0.75 ? 1.0 : 1.0 - (tp - 0.75) / 0.25;
    const textScale = 0.38 + tp * 0.62;
    const label     = isVirgin ? '★ BOOM ★' : 'KAPOW!';
    const fill      = isVirgin ? '#DC1EFF' : '#FF7700';

    ctx.save();
    ctx.globalAlpha = Math.max(0, textAlpha);
    ctx.translate(cx + 50, feetY - 88 - tp * 14);
    ctx.scale(textScale, textScale);
    ctx.font        = 'bold 30px "Arial Black", Impact, sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle  = 'rgba(0,0,0,0.65)';
    ctx.lineWidth    = 4;
    ctx.strokeText(label, 0, 0);
    ctx.fillStyle = fill;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  // ── Screen flash ───────────────────────────────────────────────────────────
  if (t > 0.03 && t < 0.52) {
    const ft         = (t - 0.03) / 0.49;
    const flashAlpha = Math.sin(ft * Math.PI) * (isVirgin ? 0.26 : 0.20);
    ctx.fillStyle = isVirgin
      ? `rgba(150,0,255,${flashAlpha})`
      : `rgba(255,90,0,${flashAlpha})`;
    ctx.fillRect(0, 0, CW, CH);
  }
}

// ── Drawing: obstacles ────────────────────────────────────────────────────────
function drawObstacle(ctx: CanvasRenderingContext2D, x: number, type: 'low' | 'high' | 'gap') {
  if (type === 'gap') return; // gaps handled by drawGaps

  if (type === 'low') {
    const obsY = GROUND_Y - LOW_H;

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath(); ctx.roundRect(x + 4, obsY + 6, OBS_W, LOW_H, 4); ctx.fill();

    // Body (crate look)
    const bodyGrad = ctx.createLinearGradient(x, obsY, x + OBS_W, obsY + LOW_H);
    bodyGrad.addColorStop(0,   'rgba(238,230,252,0.94)');
    bodyGrad.addColorStop(0.5, 'rgba(220,210,240,0.90)');
    bodyGrad.addColorStop(1,   'rgba(195,185,220,0.88)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.roundRect(x, obsY, OBS_W, LOW_H, 4); ctx.fill();

    // Cross bracing lines (crate detail)
    ctx.strokeStyle = 'rgba(170,158,200,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 2, obsY + 2); ctx.lineTo(x + OBS_W - 2, obsY + LOW_H - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + OBS_W - 2, obsY + 2); ctx.lineTo(x + 2, obsY + LOW_H - 2); ctx.stroke();

    // Top highlight strip
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.beginPath(); ctx.roundRect(x + 3, obsY + 3, OBS_W - 6, 8, 2); ctx.fill();

    // Right side shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.roundRect(x + OBS_W - 7, obsY + 4, 7, LOW_H - 4, [0, 4, 4, 0]); ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(150,140,175,0.50)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(x, obsY, OBS_W, LOW_H, 4); ctx.stroke();

  } else {
    // Hanging obstacle / ceiling bar
    const barH = HIGH_BOT - HIGH_TOP;

    // Ceiling rod (cable)
    ctx.strokeStyle = 'rgba(170,158,200,0.45)';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x + OBS_W / 2, 0); ctx.lineTo(x + OBS_W / 2, HIGH_TOP); ctx.stroke();
    ctx.setLineDash([]);

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.roundRect(x + 4, HIGH_TOP + 4, OBS_W, barH, 4); ctx.fill();

    // Body gradient
    const bGrad = ctx.createLinearGradient(x, HIGH_TOP, x + OBS_W, HIGH_BOT);
    bGrad.addColorStop(0,   'rgba(222,214,238,0.92)');
    bGrad.addColorStop(0.5, 'rgba(205,196,225,0.88)');
    bGrad.addColorStop(1,   'rgba(185,175,208,0.86)');
    ctx.fillStyle = bGrad;
    ctx.beginPath(); ctx.roundRect(x, HIGH_TOP, OBS_W, barH, 4); ctx.fill();

    // Highlight strip
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.roundRect(x + 3, HIGH_TOP + 3, OBS_W - 6, 8, 2); ctx.fill();

    // Right shadow
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath(); ctx.roundRect(x + OBS_W - 7, HIGH_TOP + 4, 7, barH - 4, [0, 4, 4, 0]); ctx.fill();

    // Warning stripes on bottom
    ctx.fillStyle = 'rgba(255,200,60,0.40)';
    ctx.beginPath(); ctx.roundRect(x, HIGH_BOT - 8, OBS_W, 8, [0, 0, 4, 4]); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 10 + 2, HIGH_BOT - 8);
      ctx.lineTo(x + i * 10 + 8, HIGH_BOT);
      ctx.lineTo(x + i * 10 + 2, HIGH_BOT);
      ctx.closePath();
      ctx.fill();
    }

    // Rod cap
    const capGrad = ctx.createRadialGradient(x + OBS_W / 2 - 1, HIGH_TOP - 1, 1, x + OBS_W / 2, HIGH_TOP, 6);
    capGrad.addColorStop(0, 'rgba(240,232,252,0.95)');
    capGrad.addColorStop(1, 'rgba(195,185,220,0.70)');
    ctx.fillStyle = capGrad;
    ctx.beginPath(); ctx.arc(x + OBS_W / 2, HIGH_TOP, 5.5, 0, Math.PI * 2); ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(150,140,175,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.roundRect(x, HIGH_TOP, OBS_W, barH, 4); ctx.stroke();
  }
}

// ── Drawing: chaser character ─────────────────────────────────────────────────
function drawChaser(
  ctx: CanvasRenderingContext2D,
  cx: number, feetY: number,
  legPhase: number,
  level: number,
  crouching = false,
) {
  // Crouching mode — compressed pose
  if (crouching) {
    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.beginPath();
    ctx.ellipse(cx, feetY + 1, 18, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bent legs wide
    ctx.strokeStyle = 'rgba(215,185,155,0.92)';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 8, feetY - 14); ctx.lineTo(cx - 18, feetY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 8, feetY - 14); ctx.lineTo(cx + 18, feetY); ctx.stroke();

    // Feet wide
    ctx.fillStyle = 'rgba(215,185,155,0.88)';
    ctx.beginPath(); ctx.ellipse(cx - 18, feetY, 5.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 18, feetY, 5.5, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Pink briefs
    ctx.fillStyle = 'rgba(255,110,145,0.94)';
    ctx.beginPath();
    ctx.moveTo(cx - 16, feetY - 14);
    ctx.lineTo(cx + 16, feetY - 14);
    ctx.lineTo(cx + 10, feetY - 24);
    ctx.lineTo(cx - 10, feetY - 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,140,168,0.92)';
    ctx.fillRect(cx - 16, feetY - 26, 32, 4);

    // Torso squished
    const skin = 'rgba(225,192,158,0.94)';
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(cx - 20, feetY - 26);
    ctx.lineTo(cx + 20, feetY - 26);
    ctx.lineTo(cx + 24, feetY - 46);
    ctx.lineTo(cx - 24, feetY - 46);
    ctx.closePath();
    ctx.fill();

    // Arms spread out
    ctx.strokeStyle = skin;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 22, feetY - 44); ctx.lineTo(cx + 34, feetY - 30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 22, feetY - 44); ctx.lineTo(cx - 34, feetY - 30);
    ctx.stroke();

    // Head lower
    ctx.fillStyle = 'rgba(228,196,162,0.95)';
    ctx.beginPath(); ctx.arc(cx, feetY - 55, 11, 0, Math.PI * 2); ctx.fill();

    // Hair — squished pompadour
    ctx.fillStyle = 'rgba(255,215,55,0.96)';
    ctx.beginPath();
    ctx.moveTo(cx - 11, feetY - 60);
    ctx.quadraticCurveTo(cx, feetY - 64, cx + 11, feetY - 60);
    ctx.quadraticCurveTo(cx + 12, feetY - 56, cx + 10, feetY - 52);
    ctx.quadraticCurveTo(cx, feetY - 50, cx - 11, feetY - 52);
    ctx.closePath();
    ctx.fill();
    // Pompadour front (flattened)
    ctx.fillStyle = 'rgba(255,225,75,0.97)';
    ctx.beginPath();
    ctx.moveTo(cx - 8,  feetY - 60);
    ctx.quadraticCurveTo(cx - 4, feetY - 72, cx + 2, feetY - 74);
    ctx.quadraticCurveTo(cx + 8, feetY - 70, cx + 10, feetY - 62);
    ctx.quadraticCurveTo(cx + 4, feetY - 60, cx,      feetY - 60);
    ctx.closePath();
    ctx.fill();

    // Sunglasses
    ctx.fillStyle = 'rgba(15,12,22,0.96)';
    ctx.beginPath(); ctx.roundRect(cx - 12, feetY - 59, 10, 6, 1.5); ctx.fill();
    ctx.beginPath(); ctx.roundRect(cx + 2,  feetY - 59, 10, 6, 1.5); ctx.fill();
    ctx.fillStyle = 'rgba(35,30,48,0.90)';
    ctx.fillRect(cx - 2, feetY - 57, 4, 2);

    ctx.restore();
    return;
  }
  const sw = Math.sin(legPhase * 1.1) * 11;
  const bob = Math.abs(Math.sin(legPhase * 0.55)) * 2.5;

  ctx.save();
  ctx.translate(0, -bob);

  // At Menopause level — intense body aura + flames (drawn later above the head)
  if (level >= 4) {
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(legPhase * 2) * 0.08;
    const aura = ctx.createRadialGradient(cx, feetY - 40, 4, cx, feetY - 40, 44);
    aura.addColorStop(0, 'rgba(255,100,20,0.70)');
    aura.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(cx, feetY - 40, 44, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, feetY + 1, 15, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = 'rgba(215,185,155,0.92)';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 5, feetY - 18); ctx.lineTo(cx - 11 - sw, feetY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 5, feetY - 18); ctx.lineTo(cx + 11 + sw, feetY); ctx.stroke();

  // Bare feet/toes
  ctx.fillStyle = 'rgba(215,185,155,0.88)';
  ctx.beginPath(); ctx.ellipse(cx - 11 - sw, feetY, 5.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 11 + sw, feetY, 5.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  // Toe line
  ctx.strokeStyle = 'rgba(185,155,125,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - 14 - sw, feetY - 1); ctx.lineTo(cx - 7 - sw, feetY - 1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 8 + sw,  feetY - 1); ctx.lineTo(cx + 14 + sw, feetY - 1); ctx.stroke();

  // Pink briefs
  ctx.fillStyle = 'rgba(255,110,145,0.94)';
  ctx.beginPath();
  ctx.moveTo(cx - 14, feetY - 18);
  ctx.lineTo(cx + 14, feetY - 18);
  ctx.lineTo(cx + 10, feetY - 30);
  ctx.lineTo(cx - 10, feetY - 30);
  ctx.closePath();
  ctx.fill();
  // Briefs waistband
  ctx.fillStyle = 'rgba(255,140,168,0.92)';
  ctx.fillRect(cx - 14, feetY - 32, 28, 5);
  // Briefs logo stripe
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(cx - 2, feetY - 31, 4, 3);
  // Briefs shadow/crease
  ctx.fillStyle = 'rgba(200,60,90,0.30)';
  ctx.beginPath();
  ctx.moveTo(cx, feetY - 18);
  ctx.lineTo(cx, feetY - 30);
  ctx.stroke();

  // Torso — exaggerated V-shape muscular build
  const skin = 'rgba(225,192,158,0.94)';
  // Main torso trapezoid
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(cx - 20, feetY - 32);  // bottom-left (narrow waist)
  ctx.lineTo(cx + 20, feetY - 32);  // bottom-right
  ctx.lineTo(cx + 26, feetY - 62);  // top-right (wide shoulders)
  ctx.lineTo(cx - 26, feetY - 62);  // top-left
  ctx.closePath();
  ctx.fill();

  // Pec muscles
  ctx.fillStyle = 'rgba(205,172,138,0.45)';
  ctx.beginPath(); ctx.ellipse(cx - 10, feetY - 50, 9, 7, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 10, feetY - 50, 9, 7, -0.2, 0, Math.PI * 2); ctx.fill();
  // Ab lines
  ctx.strokeStyle = 'rgba(195,162,128,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx, feetY - 32); ctx.lineTo(cx, feetY - 60); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 10, feetY - 40); ctx.lineTo(cx + 10, feetY - 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 11, feetY - 48); ctx.lineTo(cx + 11, feetY - 48); ctx.stroke();
  // Shoulder highlights
  ctx.fillStyle = 'rgba(245,215,185,0.40)';
  ctx.beginPath(); ctx.ellipse(cx - 24, feetY - 60, 7, 5, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 24, feetY - 60, 7, 5, -0.4, 0, Math.PI * 2); ctx.fill();

  // Arms — pumping
  const armSwing = Math.sin(legPhase * 1.1 + Math.PI) * 12;
  ctx.strokeStyle = skin;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  // Right arm
  ctx.beginPath();
  ctx.moveTo(cx + 24, feetY - 60);
  ctx.quadraticCurveTo(cx + 34 + armSwing, feetY - 50, cx + 28 + armSwing * 0.6, feetY - 38);
  ctx.stroke();
  // Left arm
  ctx.beginPath();
  ctx.moveTo(cx - 24, feetY - 60);
  ctx.quadraticCurveTo(cx - 34 - armSwing, feetY - 50, cx - 28 - armSwing * 0.6, feetY - 38);
  ctx.stroke();

  // Head
  ctx.fillStyle = 'rgba(228,196,162,0.95)';
  ctx.beginPath(); ctx.arc(cx, feetY - 72, 11, 0, Math.PI * 2); ctx.fill();

  // Chin/jaw — strong jaw
  ctx.fillStyle = 'rgba(215,182,148,0.90)';
  ctx.beginPath();
  ctx.moveTo(cx - 8, feetY - 62);
  ctx.quadraticCurveTo(cx, feetY - 56, cx + 8, feetY - 62);
  ctx.closePath();
  ctx.fill();

  // Blond pompadour hair
  ctx.fillStyle = 'rgba(255,215,55,0.96)';
  // Base hair covering top
  ctx.beginPath();
  ctx.moveTo(cx - 11, feetY - 76);
  ctx.quadraticCurveTo(cx, feetY - 80, cx + 11, feetY - 76);
  ctx.quadraticCurveTo(cx + 12, feetY - 72, cx + 11, feetY - 68);
  ctx.quadraticCurveTo(cx,      feetY - 66, cx - 11, feetY - 68);
  ctx.closePath();
  ctx.fill();
  // Pompadour upswept front
  ctx.fillStyle = 'rgba(255,225,75,0.97)';
  ctx.beginPath();
  ctx.moveTo(cx - 8,  feetY - 76);
  ctx.quadraticCurveTo(cx - 6, feetY - 96, cx + 2, feetY - 100);
  ctx.quadraticCurveTo(cx + 8, feetY - 95, cx + 10, feetY - 82);
  ctx.quadraticCurveTo(cx + 6, feetY - 78, cx,      feetY - 76);
  ctx.closePath();
  ctx.fill();
  // Hair shine
  ctx.fillStyle = 'rgba(255,248,160,0.55)';
  ctx.beginPath();
  ctx.moveTo(cx - 4, feetY - 78);
  ctx.quadraticCurveTo(cx - 3, feetY - 94, cx + 1, feetY - 96);
  ctx.quadraticCurveTo(cx + 2, feetY - 90, cx + 2, feetY - 80);
  ctx.closePath();
  ctx.fill();

  // Black sunglasses — cool rectangular frames
  ctx.fillStyle = 'rgba(15,12,22,0.96)';
  ctx.beginPath(); ctx.roundRect(cx - 12, feetY - 75, 10, 6, 1.5); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 2,  feetY - 75, 10, 6, 1.5); ctx.fill();
  // Bridge
  ctx.fillStyle = 'rgba(35,30,48,0.90)';
  ctx.fillRect(cx - 2, feetY - 73, 4, 2);
  // Lens shine
  ctx.fillStyle = 'rgba(80,80,120,0.40)';
  ctx.beginPath(); ctx.roundRect(cx - 11, feetY - 74, 4, 2, 1); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 3,  feetY - 74, 4, 2, 1); ctx.fill();
  // Side arms
  ctx.strokeStyle = 'rgba(25,20,38,0.88)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - 12, feetY - 72); ctx.lineTo(cx - 16, feetY - 71); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 12, feetY - 72); ctx.lineTo(cx + 16, feetY - 71); ctx.stroke();

  // Smirk
  ctx.strokeStyle = 'rgba(185,145,110,0.70)';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 3, feetY - 65);
  ctx.quadraticCurveTo(cx + 1, feetY - 62, cx + 6, feetY - 64);
  ctx.stroke();

  // ── Menopause flames — cartoon fire above the head ───────────────────────
  if (level >= 4) {
    drawChaserFlames(ctx, cx, feetY, legPhase);
  }

  ctx.restore();
}

function drawChaserFlames(
  ctx: CanvasRenderingContext2D,
  cx: number, feetY: number, phase: number,
) {
  // Animate using phase as time proxy — fast flicker
  const t = phase * 1.8;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // Draw 3 overlapping flame tongues — center, left, right
  const tongues = [
    { ox: 0,   height: 28, wBase: 9,  color1: 'rgba(255,255,80,0.95)',  color2: 'rgba(255,130,0,0)',  phase: t },
    { ox: -8,  height: 20, wBase: 7,  color1: 'rgba(255,200,30,0.90)',  color2: 'rgba(255,60,0,0)',   phase: t + 1.1 },
    { ox: 8,   height: 22, wBase: 7,  color1: 'rgba(255,160,20,0.88)',  color2: 'rgba(200,20,0,0)',   phase: t + 2.3 },
    { ox: -4,  height: 16, wBase: 5,  color1: 'rgba(255,255,140,0.80)', color2: 'rgba(255,80,0,0)',   phase: t + 0.5 },
    { ox: 5,   height: 14, wBase: 5,  color1: 'rgba(255,220,50,0.75)',  color2: 'rgba(255,40,0,0)',   phase: t + 3.1 },
  ];

  // Base y: just above the pompadour tip (feetY - 100 approx)
  const baseY = feetY - 105;

  for (const tongue of tongues) {
    const sway   = Math.sin(tongue.phase * 3.4) * 3.5;
    const flick  = 0.85 + Math.sin(tongue.phase * 5.2) * 0.15;
    const h      = tongue.height * flick;
    const tipX   = cx + tongue.ox + sway;
    const tipY   = baseY - h;
    const leftX  = cx + tongue.ox - tongue.wBase;
    const rightX = cx + tongue.ox + tongue.wBase;

    const grad = ctx.createLinearGradient(tipX, tipY, tipX, baseY);
    grad.addColorStop(0,   tongue.color1);
    grad.addColorStop(0.5, tongue.color2.replace('0)', '0.60)'));
    grad.addColorStop(1,   tongue.color2);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(leftX, baseY);
    ctx.quadraticCurveTo(leftX  - 2, baseY - h * 0.55, tipX, tipY);
    ctx.quadraticCurveTo(rightX + 2, baseY - h * 0.55, rightX, baseY);
    ctx.closePath();
    ctx.fill();
  }

  // Bright inner core glow
  const coreGrad = ctx.createRadialGradient(cx, baseY - 10, 2, cx, baseY - 10, 12);
  coreGrad.addColorStop(0, `rgba(255,255,200,${0.70 + Math.sin(t * 4) * 0.20})`);
  coreGrad.addColorStop(1, 'rgba(255,180,0,0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath(); ctx.arc(cx, baseY - 8, 12, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ── Drawing: grandma foot flames (Last Breath level) ─────────────────────────
function drawGrandmaFootFlames(
  ctx: CanvasRenderingContext2D,
  cx: number, feetY: number, phase: number,
) {
  const t = phase * 2.0;
  ctx.save();

  // Foot positions mirror the walking animation leg swing
  const sw   = Math.sin(phase) * 9;
  const feet = [cx - 10 - sw, cx + 10 + sw];

  for (let fi = 0; fi < feet.length; fi++) {
    const fx    = feet[fi];
    const phOff = fi * Math.PI + 0.4;
    const baseY = feetY + 2; // just below foot sole

    // Three downward flame tongues per foot — trail backward (leftward) as she runs right
    const tongues = [
      { ox:  0, h: 20, w: 5.5, t: t + phOff       },
      { ox: -4, h: 14, w: 3.5, t: t + phOff + 1.0 },
      { ox:  3, h: 15, w: 3.5, t: t + phOff + 2.1 },
    ];

    for (const tg of tongues) {
      const sway  = Math.sin(tg.t * 3.2) * 2.5;
      const flick = 0.80 + Math.sin(tg.t * 5.0) * 0.20;
      const h     = tg.h * flick;
      const tipX  = fx + tg.ox + sway - 5; // slight backward lean
      const tipY  = baseY + h;             // flames go DOWN
      const lx    = fx + tg.ox - tg.w;
      const rx    = fx + tg.ox + tg.w;

      const g = ctx.createLinearGradient(0, baseY, 0, tipY);
      g.addColorStop(0,   'rgba(255,255,130,0.90)');
      g.addColorStop(0.4, 'rgba(255,170,30,0.65)');
      g.addColorStop(1,   'rgba(255,50,0,0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(lx, baseY);
      ctx.quadraticCurveTo(lx - 2, baseY + h * 0.5, tipX, tipY);
      ctx.quadraticCurveTo(rx + 2, baseY + h * 0.5, rx, baseY);
      ctx.closePath();
      ctx.fill();
    }

    // Bright glow at foot base
    const glow = ctx.createRadialGradient(fx, baseY, 0, fx, baseY, 8);
    glow.addColorStop(0, `rgba(255,240,100,${0.55 + Math.sin(t * 3 + fi) * 0.18})`);
    glow.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(fx, baseY, 8, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

// ── Gap collision helper ───────────────────────────────────────────────────────
function charOverGap(charY: number, obstacles: Obstacle[]): boolean {
  if (charY < GROUND_Y - 2) return false; // airborne, no gap fall
  const cLeft  = CHAR_X - CHAR_HW_STAND;
  const cRight = CHAR_X + CHAR_HW_STAND;
  for (const obs of obstacles) {
    if (obs.type !== 'gap') continue;
    const gLeft  = obs.x;
    const gRight = obs.x + GAP_W;
    // Character must be mostly over the gap to fall
    const overlapL = Math.max(cLeft,  gLeft);
    const overlapR = Math.min(cRight, gRight);
    if (overlapR - overlapL > CHAR_HW_STAND) return true;
  }
  return false;
}

// ── Collision detection ───────────────────────────────────────────────────────
function collides(charY: number, crouching: boolean, obs: Obstacle): boolean {
  if (obs.type === 'gap') return false; // gap handled separately
  const hw     = crouching ? CHAR_HW_CROUCH : CHAR_HW_STAND;
  const hh     = crouching ? CHAR_H_CROUCH  : CHAR_H_STAND;
  const cLeft  = CHAR_X - hw;  const cRight  = CHAR_X + hw;
  const cTop   = charY - hh;   const cBottom = charY;

  const oLeft   = obs.x;             const oRight  = obs.x + OBS_W;
  // For 'high' (ceiling/crouch) obstacles, extend the hitbox all the way to the
  // canvas top so jumping into them always causes a collision.  Only crouching
  // brings the character's top below HIGH_BOT, so only crouching passes safely.
  const oTop    = obs.type === 'low'  ? GROUND_Y - LOW_H : 0;
  const oBottom = obs.type === 'low'  ? GROUND_Y         : HIGH_BOT;

  const inset = 4;
  return (
    cRight  > oLeft   + inset &&
    cLeft   < oRight  - inset &&
    cBottom > oTop    + inset &&
    cTop    < oBottom - inset
  );
}

// ── Countdown overlay ──────────────────────────────────────────────────────────
function CountdownOverlay({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="grandma-countdown-overlay">
      <span key={count} className={`grandma-countdown-num count-n${count}`}>{count}</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  pattern:    GrandmaPattern;
  roundIndex: number;   // 0–4
  onComplete: (score: number) => void;
  onHome:     () => void;
}

export default function GrandmaGameScreen({ pattern, roundIndex, onComplete, onHome }: Props) {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ── Game state ref (all mutable state for RAF) ────────────────────────────
  const gsRef = useRef({
    charY:        GROUND_Y as number,
    charVY:       0,
    crouching:    false,
    onGround:     true,
    coyoteFrames: 0,
    jumpBuffer:   0,
    obstacles:    [] as Obstacle[],
    nextObstX:    CW + 350 as number,
    patternIdx:   0,
    elapsed:      0,
    scrollDist:   0,
    speed:        BASE_SPEED,
    alive:        false,
    dying:        false,
    deathTimer:   0,
    legPhase:     0,
    chaserLegPhase: 0,
    obsIdCounter: 0,
    currentLevel: 0,
    // Chaser sync ring buffer
    histIdx:       0,
    chaserHistY:      Array.from({ length: HIST }, () => GROUND_Y) as number[],
    chaserHistCrouch: Array.from({ length: HIST }, () => false)    as boolean[],
    chaserHistAir:    Array.from({ length: HIST }, () => false)    as boolean[],
    // Anti-repeat obstacle tracking
    lastObstType:  'low' as 'low' | 'high' | 'gap',
    sameCount:     0,
  });

  const jumpPressRef  = useRef(false);
  const crouchHeldRef = useRef(false);

  // React state for display
  const [displayScore,    setDisplayScore]    = useState(0);
  const [countdown,       setCountdown]       = useState(3);
  const [countdownActive, setCountdownActive] = useState(true);
  const [levelBanner,     setLevelBanner]     = useState<LevelName | null>(null);
  const [virginMode,      setVirginMode]      = useState(false);
  const [showRotateHint,  setShowRotateHint]  = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Portrait hint ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (window.innerHeight > window.innerWidth) {
      setShowRotateHint(true);
      const t = setTimeout(() => setShowRotateHint(false), 2800);
      return () => clearTimeout(t);
    }
  }, []);

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const ticks = [
      () => setCountdown(2),
      () => setCountdown(1),
      () => { setCountdown(0); setCountdownActive(false); gsRef.current.alive = true; },
    ];
    ticks.forEach((fn, i) => timers.push(setTimeout(fn, (i + 1) * 900)));
    return () => timers.forEach(clearTimeout);
  }, []);

  // ── RAF game loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;
    let lastTime = 0;

    function drawScore(elapsed: number, level: number) {
      const score = Math.floor(elapsed);
      ctx.save();
      ctx.font         = 'bold 22px -apple-system, Helvetica Neue, sans-serif';
      ctx.fillStyle    = 'rgba(255,255,255,0.92)';
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(`${score}`, CW - 22, 20);
      ctx.font      = '12px -apple-system, Helvetica Neue, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fillText('pts', CW - 22, 46);
      // Speed level indicator (small)
      ctx.font      = '11px -apple-system, Helvetica Neue, sans-serif';
      ctx.fillStyle = level >= 6
        ? 'rgba(220,30,255,0.95)'   // Virgin Mode — neon purple
        : level >= 5
        ? 'rgba(255,60,0,0.95)'     // Last Dance — red-orange
        : level >= 4
        ? 'rgba(255,180,50,0.80)'   // Menopause — amber
        : 'rgba(255,255,255,0.32)';
      ctx.textAlign = 'left';
      ctx.fillText(SPEED_LEVELS[level].name, 22, 20);
      ctx.restore();
    }

    function tick(now: number) {
      animId = requestAnimationFrame(tick);
      const rawDt = Math.min(now - lastTime, 50);
      lastTime = now;
      const dt  = rawDt / (1000 / 60);
      const gs  = gsRef.current;

      drawBackground(ctx, gs.scrollDist, gs.currentLevel);
      drawGround(ctx, gs.scrollDist);
      drawGaps(ctx, gs.obstacles);

      // ── Death animation ───────────────────────────────────────────────────
      if (gs.dying) {
        gs.deathTimer += rawDt;
        const t = Math.min(1, gs.deathTimer / DEATH_MS);

        for (const obs of gs.obstacles) drawObstacle(ctx, obs.x, obs.type);

        // Chaser stops and reacts (frozen at leftmost position)
        drawChaser(ctx, 40, GROUND_Y, 0, gs.currentLevel, false);

        if (gs.currentLevel >= 5) {
          // Dramatic cartoon death: head pop + stars + KAPOW text
          drawDramaticDeath(ctx, CHAR_X, gs.charY, t, gs.currentLevel);
        } else {
          // Standard death: scale-up + red splat
          const deathScale = 1 + t * 3.8;
          const deathAlpha = t < 0.65 ? 1.0 : 1.0 - (t - 0.65) / 0.35;
          drawGrandmaDying(ctx, CHAR_X, gs.charY, deathScale, deathAlpha);

          if (t > 0.15) drawSplat(ctx, CHAR_X, gs.charY - CHAR_H_STAND / 2, (t - 0.15) / 0.85);

          if (t > 0.22 && t < 0.65) {
            ctx.fillStyle = `rgba(200,25,18,${0.18 * Math.sin((t - 0.22) / 0.43 * Math.PI)})`;
            ctx.fillRect(0, 0, CW, CH);
          }
        }

        drawScore(gs.elapsed, gs.currentLevel);

        if (gs.deathTimer >= DEATH_MS) {
          gs.dying = false;
          const finalScore = Math.floor(gs.elapsed);
          setTimeout(() => onCompleteRef.current(finalScore), 50);
          cancelAnimationFrame(animId);
          return;
        }
        return;
      }

      // ── Waiting for countdown ─────────────────────────────────────────────
      if (!gs.alive) {
        const chaserX = CHAR_X - 90;
        drawChaser(ctx, chaserX, GROUND_Y, gs.chaserLegPhase, 0, false);
        drawGrandmaStanding(ctx, CHAR_X, GROUND_Y, 0);
        return;
      }

      // ── Normal gameplay ───────────────────────────────────────────────────

      // Elapsed time
      gs.elapsed += dt / 60;

      // ── Speed level detection ────────────────────────────────────────────
      const newLevel =
        gs.elapsed >= 50 ? 6 :
        gs.elapsed >= 40 ? 5 :
        gs.elapsed >= 30 ? 4 :
        gs.elapsed >= 20 ? 3 :
        gs.elapsed >= 10 ? 2 :
        gs.elapsed >= 5  ? 1 : 0;

      if (newLevel !== gs.currentLevel) {
        gs.currentLevel = newLevel;
        const bannerName = SPEED_LEVELS[newLevel].name as LevelName;
        setLevelBanner(bannerName);
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        const bannerDur = newLevel >= 5 ? 2400 : 1900;
        bannerTimerRef.current = setTimeout(() => setLevelBanner(null), bannerDur);
        if (newLevel >= 6) setVirginMode(true);
      }

      // Smooth speed lerp toward the target multiplier for current level
      const targetSpd = BASE_SPEED * SPEED_LEVELS[gs.currentLevel].multiplier;
      gs.speed       += (targetSpd - gs.speed) * LERP_F * dt;
      gs.scrollDist  += gs.speed * dt;

      // ── Jump input handling with coyote + buffer ──────────────────────────
      if (jumpPressRef.current) {
        gs.jumpBuffer    = BUFFER_F;
        jumpPressRef.current = false;
      }

      if (gs.onGround) {
        gs.coyoteFrames = COYOTE_F;
      } else if (gs.coyoteFrames > 0) {
        gs.coyoteFrames -= dt;
      }

      if (gs.jumpBuffer > 0) gs.jumpBuffer -= dt;

      const canJump = gs.onGround || gs.coyoteFrames > 0;
      if (gs.jumpBuffer > 0 && canJump) {
        gs.charVY       = JUMP_VY;
        gs.onGround     = false;
        gs.coyoteFrames = 0;
        gs.jumpBuffer   = 0;
      }

      // Crouch only on ground
      gs.crouching = crouchHeldRef.current && gs.onGround;

      // Gravity + vertical integration
      gs.charVY += GRAVITY * dt;
      gs.charY  += gs.charVY * dt;

      // ── Ground / gap collision ────────────────────────────────────────────
      if (gs.charY >= GROUND_Y) {
        if (charOverGap(gs.charY, gs.obstacles)) {
          // Fell into gap
          gs.alive      = false;
          gs.dying      = true;
          gs.deathTimer = 0;
        } else {
          gs.charY    = GROUND_Y;
          gs.charVY   = 0;
          gs.onGround = true;
        }
      }

      // Leg + chaser animation
      gs.legPhase       += gs.speed * dt * 0.042;
      gs.chaserLegPhase += (gs.speed * 1.02) * dt * 0.044;

      // ── Chaser sync ring buffer ───────────────────────────────────────────
      // Read delayed state (oldest entry) BEFORE overwriting
      const chaserFeetY    = gs.chaserHistY[gs.histIdx];
      const chaserCrouch   = gs.chaserHistCrouch[gs.histIdx];
      const chaserAirborne = gs.chaserHistAir[gs.histIdx];
      // Write current grandma state
      gs.chaserHistY[gs.histIdx]      = gs.charY;
      gs.chaserHistCrouch[gs.histIdx] = gs.crouching;
      gs.chaserHistAir[gs.histIdx]    = !gs.onGround;
      gs.histIdx = (gs.histIdx + 1) % HIST;

      // ── Obstacle spawn ────────────────────────────────────────────────────
      const needsSpawn = gs.obstacles.length === 0
        || gs.obstacles[gs.obstacles.length - 1].x < CW - gs.nextObstX;

      if (needsSpawn) {
        let rawType = pattern.sequence[gs.patternIdx % pattern.sequence.length] as 'low' | 'high' | 'gap';

        // Anti-repeat: prevent more than 2 consecutive same-type obstacles
        if (rawType === gs.lastObstType) {
          gs.sameCount++;
          if (gs.sameCount >= 2) {
            const pool = (['low', 'high', 'gap'] as const).filter(t => t !== rawType);
            rawType = pool[Math.floor(Math.random() * pool.length)];
            gs.sameCount = 0;
          }
        } else {
          gs.sameCount = 0;
        }
        gs.lastObstType = rawType;

        gs.obstacles.push({ id: ++gs.obsIdCounter, x: CW + 60, type: rawType });
        gs.patternIdx++;
        const baseGap = pattern.baseGap + (Math.random() - 0.5) * 2 * pattern.variance;
        // Speed-aware minimum gap (at least 38 frames of travel time)
        const minGap = Math.max(340, gs.speed * 38);
        gs.nextObstX = Math.max(minGap, baseGap);
      }

      // Move + prune
      for (const obs of gs.obstacles) obs.x -= gs.speed * dt;
      gs.obstacles = gs.obstacles.filter(o => o.x > -(OBS_W + GAP_W + 20));

      // ── Obstacle collision ────────────────────────────────────────────────
      if (!gs.dying) {
        for (const obs of gs.obstacles) {
          if (collides(gs.charY, gs.crouching, obs)) {
            gs.alive      = false;
            gs.dying      = true;
            gs.deathTimer = 0;
            break;
          }
        }
      }

      // ── Draw frame ───────────────────────────────────────────────────────
      for (const obs of gs.obstacles) drawObstacle(ctx, obs.x, obs.type);

      // Last Dance + Virgin Mode — grandma foot flames (drawn before grandma body)
      if (gs.currentLevel >= 5 && gs.onGround) {
        drawGrandmaFootFlames(ctx, CHAR_X, gs.charY, gs.legPhase);
      }

      // Chaser — creeps closer at higher levels, mirrors grandma with delay
      const chaserX = (CHAR_X - 90) + gs.currentLevel * 8;
      if (chaserCrouch) {
        drawChaser(ctx, chaserX, GROUND_Y, gs.chaserLegPhase, gs.currentLevel, true);
      } else if (chaserAirborne) {
        drawChaser(ctx, chaserX, chaserFeetY, gs.chaserLegPhase, gs.currentLevel, false);
      } else {
        drawChaser(ctx, chaserX, GROUND_Y, gs.chaserLegPhase, gs.currentLevel, false);
      }

      // Grandma
      const airborne = !gs.onGround;
      if (gs.crouching) {
        drawGrandmaCrouching(ctx, CHAR_X, gs.charY);
      } else if (airborne) {
        drawGrandmaJumping(ctx, CHAR_X, gs.charY);
      } else {
        drawGrandmaStanding(ctx, CHAR_X, gs.charY, gs.legPhase, false);
      }

      drawScore(gs.elapsed, gs.currentLevel);

      // Throttle React re-render
      const intScore = Math.floor(gs.elapsed);
      setDisplayScore(prev => prev !== intScore ? intScore : prev);
    }

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [pattern]);

  // ── Keyboard controls ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        jumpPressRef.current  = true;
        crouchHeldRef.current = false;
      }
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        crouchHeldRef.current = true;
        jumpPressRef.current  = false;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        crouchHeldRef.current = false;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // ── Touch zones ───────────────────────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t    = e.changedTouches[i];
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (t.clientX - rect.left < rect.width / 2) {
        jumpPressRef.current = true;
      } else {
        crouchHeldRef.current = true;
      }
    }
  }
  function handleTouchEnd(e: React.TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t    = e.changedTouches[i];
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      if (t.clientX - rect.left >= rect.width / 2) crouchHeldRef.current = false;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="grandma-game-wrap"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Header */}
      <div className="grandma-game-header">
        <button
          className="color-overlay-btn"
          onClick={onHome}
          style={{ pointerEvents: 'auto', color: 'rgba(255,255,255,0.55)' }}
        >
          ← Home
        </button>
        <span className="grandma-round-label">Round {roundIndex + 1} of 5</span>
        <span className="grandma-score-live">{displayScore}</span>
      </div>

      {/* Canvas + overlays */}
      <div className={`grandma-game-field${virginMode ? ' grandma-game-field--virgin' : ''}`} style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          className="grandma-game-canvas"
          width={CW}
          height={CH}
        />

        {/* Level-up banner */}
        {levelBanner && (
          <div className={`grandma-level-banner${levelBanner === 'Virgin Mode' ? ' grandma-level-banner--shake' : ''}`} key={levelBanner}>
            <span className={[
              'grandma-level-name',
              levelBanner === 'Menopause'   ? 'grandma-level-name--prime'      : '',
              levelBanner === 'Last Dance'  ? 'grandma-level-name--lastbreath' : '',
              levelBanner === 'Virgin Mode' ? 'grandma-level-name--virgin'     : '',
            ].filter(Boolean).join(' ')}>
              {levelBanner}
            </span>
          </div>
        )}

        <div className="grandma-touch-zones" aria-hidden="true">
          <div className="grandma-touch-zone grandma-touch-zone--jump">JUMP</div>
          <div className="grandma-touch-zone grandma-touch-zone--crouch">DUCK</div>
        </div>

        {showRotateHint && (
          <div className="grandma-rotate-hint" aria-live="polite">
            ↔ Rotate phone for wider view
          </div>
        )}
      </div>

      {/* Countdown */}
      {countdownActive && <CountdownOverlay count={countdown} />}
    </div>
  );
}
