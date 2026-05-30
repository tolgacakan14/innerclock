interface Props {
  onStart: () => void;
  onBack:  () => void;
}

export default function GolfIntroScreen({ onStart, onBack }: Props) {
  return (
    <div className="screen start-screen">
      <button className="back-btn" onClick={onBack}>← Home</button>

      <div className="start-hero">
        {/* Flag + hole mark */}
        <svg
          className="golf-intro-mark"
          width="72" height="80"
          viewBox="0 0 72 80"
          fill="none"
          aria-hidden="true"
        >
          {/* Course outline */}
          <rect x="8" y="52" width="56" height="20" rx="6"
            stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none" />
          {/* Hole */}
          <ellipse cx="36" cy="62" rx="10" ry="5"
            fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.40)" strokeWidth="1.5" />
          {/* Flag pole */}
          <line x1="36" y1="57" x2="36" y2="16"
            stroke="rgba(255,255,255,0.70)" strokeWidth="2" strokeLinecap="round" />
          {/* Flag */}
          <polygon
            points="36,16 58,24 36,32"
            fill="rgba(48,209,88,0.85)"
          />
          {/* Ball */}
          <circle cx="36" cy="62" r="6"
            fill="rgba(255,255,255,0.92)"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.55))' }}
          />
        </svg>

        <p className="start-mode-label">Golf Mode</p>
        <h1 className="start-title">Five Courses</h1>
        <p className="start-subtitle">
          Aim, shoot, and sink the ball in as few shots as possible.
          Lower score wins.
        </p>
      </div>

      <div className="golf-intro-rules">
        <div className="golf-intro-rule">
          <span className="golf-intro-rule-icon">⛳</span>
          <span>5 unique courses selected each game — every run is different.</span>
        </div>
        <div className="golf-intro-rule">
          <span className="golf-intro-rule-icon">✦</span>
          <span>Drag from the ball to aim. Release to shoot. Fewer shots = better score.</span>
        </div>
        <div className="golf-intro-rule">
          <span className="golf-intro-rule-icon">↻</span>
          <span>Ball bounces off walls. Use the angles.</span>
        </div>
      </div>

      <button className="btn-primary" onClick={onStart}>
        Tee Off
      </button>
    </div>
  );
}
