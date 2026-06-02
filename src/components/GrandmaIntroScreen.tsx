interface Props {
  onStart:    () => void;
  onBack:     () => void;
  onHotMode?: () => void;
}

export default function GrandmaIntroScreen({ onStart, onBack, onHotMode }: Props) {
  return (
    <div className="screen start-screen">
      <button className="back-btn" onClick={onBack}>← Home</button>

      <div className="start-hero">
        {/* Grandma silhouette mark */}
        <svg
          className="grandma-intro-mark"
          width="72" height="80"
          viewBox="0 0 72 80"
          fill="none"
          aria-hidden="true"
        >
          {/* Dress / body */}
          <path d="M28 68 L44 68 L41 44 L31 44 Z" fill="rgba(200,185,215,0.90)" />
          {/* Upper body */}
          <ellipse cx="36" cy="39" rx="8" ry="10" fill="rgba(225,215,230,0.90)" />
          {/* Head */}
          <circle cx="37" cy="27" r="9" fill="rgba(210,180,150,0.92)" />
          {/* Hair bun */}
          <circle cx="38" cy="18.5" r="5.5" fill="rgba(210,208,212,0.92)" />
          {/* Cane */}
          <line x1="43" y1="50" x2="52" y2="68" stroke="rgba(175,160,135,0.80)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M52 65 Q56 65 56 60" stroke="rgba(175,160,135,0.80)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Ground line */}
          <line x1="8" y1="68" x2="64" y2="68" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
          {/* Low obstacle */}
          <rect x="54" y="52" width="10" height="16" rx="2" fill="rgba(230,225,240,0.75)" />
        </svg>

        <p className="start-mode-label">Grandma Walking</p>
        <h1 className="start-title">Survive Five Runs</h1>
        <p className="start-subtitle">
          Jump over obstacles, duck under barriers.
          Score 1 point for every second Grandma survives.
        </p>
      </div>

      <div className="grandma-intro-rules">
        <div className="grandma-intro-rule">
          <span className="grandma-intro-rule-icon">↻</span>
          <span>
            <strong>On mobile</strong> — turn your phone sideways after tapping Start
          </span>
        </div>
        <div className="grandma-intro-rule">
          <span className="grandma-intro-rule-icon">↓</span>
          <span>
            <strong>Left side</strong> — hold to duck · release to stand · ↓ / S on desktop
          </span>
        </div>
        <div className="grandma-intro-rule">
          <span className="grandma-intro-rule-icon">↑</span>
          <span>
            <strong>Right side</strong> — tap to jump · Space / ↑ on desktop
          </span>
        </div>
        <div className="grandma-intro-rule">
          <span className="grandma-intro-rule-icon">⏱</span>
          <span>5 rounds · speed increases over time · total score = sum of all rounds</span>
        </div>
      </div>

      <div className="grandma-intro-speeds">
        <p className="grandma-intro-speeds-label">Speed levels</p>
        <div className="grandma-intro-speed-pills">
          {['Beginner', 'Adapte', 'Normal', 'Back to 20s', 'Menopause', 'Last Dance', 'Virgin Mode'].map((name, i) => (
            <span key={name} className="grandma-intro-speed-pill" style={{ opacity: 0.45 + i * 0.08 }}>
              {name}
            </span>
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={onStart}>
        Let's Go
      </button>

      {onHotMode && (
        <button className="grandma-hot-btn" onClick={onHotMode}>
          🔥 Hot Mode
          <span className="grandma-hot-btn-sub">Extreme · 2× Speed</span>
        </button>
      )}
    </div>
  );
}
