import { useState, useRef, useCallback } from 'react';
import type { TargetColor } from '../types';
import { isColorLight } from '../utils';

interface Props {
  roundIndex:  number;
  totalRounds: number;
  onSubmit:    (color: TargetColor) => void;
  onHome:      () => void;
}

// ── Color conversions ─────────────────────────────────────────────────────────

/** HSV (h 0–360, s 0–1, v 0–1) → sRGB [0–255, 0–255, 0–255] */
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}

/** RGB [0–255] → HSL { h 0–360, s 0–100, l 0–100 } for submission */
function rgbToHsl(r: number, g: number, b: number): TargetColor {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6;                  break;
      case bn: h = ((rn - gn) / d + 4) / 6;                  break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ColorMatchScreen({ roundIndex, totalRounds, onSubmit, onHome }: Props) {
  // H: 0–360, S: 0–1, V: 0–1
  const [hue, setHue] = useState(210);
  const [sat, setSat] = useState(0.60);
  const [val, setVal] = useState(0.78);

  const svRef  = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // Derived color
  const [r, g, b]   = hsvToRgb(hue, sat, val);
  const bgColor      = `rgb(${r}, ${g}, ${b})`;
  const hsl          = rgbToHsl(r, g, b);
  const isLight      = isColorLight(hsl.h, hsl.s, hsl.l);
  const textClass    = isLight ? 'overlay-dark-text' : 'overlay-light-text';

  // Pure-hue corner color for the SV canvas gradient
  const pureHue = `hsl(${hue}, 100%, 50%)`;

  // ── SV canvas pointer handling ────────────────────────────────────────────
  const computeSV = useCallback((clientX: number, clientY: number) => {
    if (!svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    setSat(Math.max(0, Math.min(1, (clientX - rect.left)  / rect.width)));
    setVal(Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height)));
  }, []);

  // ── Hue bar pointer handling ──────────────────────────────────────────────
  const computeHue = useCallback((clientX: number) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    setHue(Math.round(Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360))));
  }, []);

  function handleSubmit() {
    onSubmit(hsl);
  }

  return (
    <div className="color-fullscreen-wrap">
      {/* ── Live full-viewport colour fill ─────────────────────────────── */}
      <div className="color-fullscreen-bg visible" style={{ background: bgColor }} />

      {/* ── Floating header ────────────────────────────────────────────── */}
      <div className={`color-fullscreen-header ${textClass}`}>
        <button className="color-overlay-btn" onClick={onHome} aria-label="Back to home">
          ← Home
        </button>
        <span className="color-overlay-round">
          Round {roundIndex + 1} of {totalRounds}
        </span>
      </div>

      {/* ── Picker panel (bottom half) ──────────────────────────────────── */}
      <div className="cpk-panel">

        {/* Prompt */}
        <p className={`cpk-prompt ${textClass}`}>Match the colour</p>

        {/* Saturation × Value canvas */}
        <div
          ref={svRef}
          className="cpk-sv-canvas"
          style={{ '--cpk-hue': pureHue } as React.CSSProperties}
          onPointerDown={e => {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            computeSV(e.clientX, e.clientY);
          }}
          onPointerMove={e => {
            if (e.buttons === 0) return;
            e.preventDefault();
            computeSV(e.clientX, e.clientY);
          }}
        >
          <div className="cpk-sv-white" />
          <div className="cpk-sv-black" />
          {/* Cursor / thumb */}
          <div
            className="cpk-sv-thumb"
            style={{
              left:        `${sat  * 100}%`,
              top:         `${(1 - val) * 100}%`,
              background:  bgColor,
              borderColor: isLight ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.90)',
            }}
          />
        </div>

        {/* Hue strip */}
        <div
          ref={hueRef}
          className="cpk-hue-bar"
          onPointerDown={e => {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            computeHue(e.clientX);
          }}
          onPointerMove={e => {
            if (e.buttons === 0) return;
            e.preventDefault();
            computeHue(e.clientX);
          }}
        >
          <div
            className="cpk-hue-thumb"
            style={{ left: `${(hue / 360) * 100}%`, background: `hsl(${hue},100%,50%)` }}
          />
        </div>

        {/* Preview swatch + submit */}
        <div className="cpk-footer">
          <div className="cpk-swatch" style={{ background: bgColor }} />
          <button
            className={`color-submit-pill flex-1 ${isLight ? 'color-submit-pill--dark' : 'color-submit-pill--light'}`}
            onClick={handleSubmit}
          >
            <span>Submit shade</span>
            <span className="submit-pill-arrow">→</span>
          </button>
        </div>

      </div>
    </div>
  );
}
