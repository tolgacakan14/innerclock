import { useState } from 'react';
import type { TargetColor } from '../types';
import { isColorLight } from '../utils';

interface Props {
  roundIndex:  number;
  totalRounds: number;
  onSubmit:    (color: TargetColor) => void;
  onHome:      () => void;
}

export default function ColorMatchScreen({ roundIndex, totalRounds, onSubmit, onHome }: Props) {
  const [hue, setHue] = useState(180);
  const [sat, setSat] = useState(60);
  const [lig, setLig] = useState(50);

  const flatBg    = `hsl(${hue}, ${sat}%, ${lig}%)`;
  const isLight   = isColorLight(hue, sat, lig);
  const textClass = isLight ? 'overlay-dark-text' : 'overlay-light-text';

  const satStyle = {
    '--track-from': `hsl(${hue}, 0%, ${lig}%)`,
    '--track-to':   `hsl(${hue}, 100%, ${lig}%)`,
  } as React.CSSProperties;

  const ligStyle = {
    '--track-from': `hsl(${hue}, ${sat}%, 0%)`,
    '--track-mid':  `hsl(${hue}, ${sat}%, 50%)`,
    '--track-to':   `hsl(${hue}, ${sat}%, 100%)`,
  } as React.CSSProperties;

  return (
    <div className="color-fullscreen-wrap">
      {/* Live-updating full-viewport color fill */}
      <div className="color-fullscreen-bg visible" style={{ background: flatBg }} />

      {/* Floating header with adaptive text */}
      <div className={`color-fullscreen-header ${textClass}`}>
        <button className="color-overlay-btn" onClick={onHome} aria-label="Back to home">
          ← Home
        </button>
        <span className="color-overlay-round">Round {roundIndex + 1} of {totalRounds}</span>
      </div>

      {/* Center prompt — lifts above the glass panel */}
      <div className={`color-fullscreen-prompt ${textClass}`}>
        <p className="color-fullscreen-title">Match the colour</p>
      </div>

      {/* Bottom glass panel — sliders + pill submit */}
      <div className="color-glass-panel">
        <div className="color-glass-sliders">
          <div className="color-glass-row">
            <span className="color-glass-label">Hue</span>
            <input
              type="range" className="slider-glass slider-glass--hue"
              min="0" max="360" value={hue}
              onChange={e => setHue(+e.target.value)}
              aria-label="Hue"
            />
            <span className="color-glass-val">{hue}°</span>
          </div>

          <div className="color-glass-row">
            <span className="color-glass-label">Saturation</span>
            <input
              type="range" className="slider-glass slider-glass--sat"
              min="20" max="100" value={sat}
              onChange={e => setSat(+e.target.value)}
              style={satStyle}
              aria-label="Saturation"
            />
            <span className="color-glass-val">{sat}%</span>
          </div>

          <div className="color-glass-row">
            <span className="color-glass-label">Lightness</span>
            <input
              type="range" className="slider-glass slider-glass--lig"
              min="15" max="85" value={lig}
              onChange={e => setLig(+e.target.value)}
              style={ligStyle}
              aria-label="Lightness"
            />
            <span className="color-glass-val">{lig}%</span>
          </div>
        </div>

        {/* Premium pill submit button — centered, adaptive */}
        <div className="color-glass-footer">
          <button
            className={`color-submit-pill ${isLight ? 'color-submit-pill--dark' : 'color-submit-pill--light'}`}
            onClick={() => onSubmit({ h: hue, s: sat, l: lig })}
          >
            <span>Submit shade</span>
            <span className="submit-pill-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
