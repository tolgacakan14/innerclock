interface Props {
  onStart: () => void;
  onBack:  () => void;
}

export default function ArrowEscapeIntroScreen({ onStart, onBack }: Props) {
  return (
    <div className="screen start-screen ae-intro-screen">
      <div className="game-header">
        <button className="home-btn" onClick={onBack} aria-label="Back to home">← Home</button>
        <span className="start-mode-label">Arrow Escape</span>
      </div>

      {/* Hero SVG — grid with escaping arrows */}
      <div className="ae-intro-hero">
        <svg viewBox="0 0 140 140" fill="none" aria-hidden="true" className="ae-intro-svg">
          {/* Grid background */}
          <rect x="10" y="10" width="120" height="120" fill="rgba(255,255,255,0.04)" rx="12"/>
          {/* Grid lines */}
          {[35,60,85,110].map(v => (
            <g key={v}>
              <line x1={v} y1="10" x2={v} y2="130" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
              <line x1="10" y1={v} x2="130" y2={v} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
            </g>
          ))}

          {/* Escaping arrow (cyan, sliding right) */}
          <g>
            <rect x="62" y="48" width="22" height="22" rx="5"
              fill="rgba(0,212,255,0.12)" stroke="rgba(0,212,255,0.60)" strokeWidth="1.5"/>
            <path d="M69 59 L80 59 M76 55 L80 59 L76 63" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Escape trail */}
            <line x1="85" y1="59" x2="130" y2="59"
              stroke="rgba(0,212,255,0.40)" strokeWidth="1.5" strokeDasharray="4 3"/>
            <path d="M128 55 L134 59 L128 63" fill="rgba(0,212,255,0.70)"/>
          </g>

          {/* Blocked arrow (magenta, shake) */}
          <g>
            <rect x="37" y="73" width="22" height="22" rx="5"
              fill="rgba(255,55,95,0.12)" stroke="rgba(255,55,95,0.55)" strokeWidth="1.5"/>
            <path d="M44 84 L55 84 M51 80 L55 84 L51 88" stroke="#FF375F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Blocker in path */}
            <rect x="62" y="73" width="22" height="22" rx="5"
              fill="rgba(255,214,10,0.12)" stroke="rgba(255,214,10,0.55)" strokeWidth="1.5"/>
            <path d="M69 84 L80 84 M76 80 L80 84 L76 88" stroke="#FFD60A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </g>

          {/* Escaped arrow top (green) */}
          <g>
            <rect x="87" y="23" width="22" height="22" rx="5"
              fill="rgba(48,209,88,0.12)" stroke="rgba(48,209,88,0.55)" strokeWidth="1.5"/>
            <path d="M98 33 L98 22 M94 26 L98 22 L102 26" stroke="#30D158" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="98" y1="19" x2="98" y2="10"
              stroke="rgba(48,209,88,0.45)" strokeWidth="1.5" strokeDasharray="3 2"/>
          </g>

          {/* Score pop */}
          <text x="110" y="56" fill="#30D158" fontSize="10" fontWeight="800" opacity="0.90">+10</text>
        </svg>
      </div>

      <div className="start-hero">
        <h2 className="start-title">Clear the board.</h2>
        <p className="start-subtitle">
          Tap arrows in the right order.<br/>
          Each arrow slides out in its direction.<br/>
          Wrong order? You lose a heart.
        </p>
      </div>

      {/* Rules */}
      <div className="ae-intro-rules">
        <div className="ae-rule-row">
          <span className="ae-rule-icon" style={{ color: '#30D158' }}>✓</span>
          <span>Clear path → arrow escapes <strong>+10</strong></span>
        </div>
        <div className="ae-rule-row">
          <span className="ae-rule-icon" style={{ color: '#FFD60A' }}>★</span>
          <span>Board cleared → <strong>+50 bonus</strong></span>
        </div>
        <div className="ae-rule-row">
          <span className="ae-rule-icon" style={{ color: '#FF375F' }}>♥</span>
          <span>Blocked move → lose a heart (3 per round)</span>
        </div>
        <div className="ae-rule-row">
          <span className="ae-rule-icon" style={{ color: '#0A84FF' }}>→</span>
          <span>5 rounds · different board each time</span>
        </div>
      </div>

      <button className="btn-primary" onClick={onStart}>
        Start Arrow Escape
      </button>
    </div>
  );
}
