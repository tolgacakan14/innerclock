interface Props {
  onStart: () => void;
  onBack:  () => void;
}

export default function RushIntroScreen({ onStart, onBack }: Props) {
  return (
    <div className="screen start-screen">
      <span className="start-mode-label">Rush Mode</span>

      <div className="start-hero">
        {/* Target-ring mark */}
        <svg
          className="rush-intro-mark"
          width="68"
          height="68"
          viewBox="0 0 68 68"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="34" cy="34" r="30" stroke="rgba(0,229,255,0.50)" strokeWidth="2" />
          <circle cx="34" cy="34" r="20" stroke="rgba(0,229,255,0.35)" strokeWidth="1.5" />
          <circle cx="34" cy="34" r="9"  stroke="rgba(0,229,255,0.55)" strokeWidth="2" />
          <circle cx="34" cy="34" r="3"  fill="rgba(0,229,255,0.80)" />
        </svg>

        <h1 className="start-title">Rush Mode</h1>

        <p className="start-subtitle">
          Tap as many symbols as you can in 30&nbsp;seconds.<br />
          The pace increases every second.
        </p>
      </div>

      {/* Rule list */}
      <div className="rush-intro-rules">
        <div className="rush-intro-rule">
          <span className="rush-intro-rule-icon" aria-hidden="true">◎</span>
          <span>A symbol appears — tap it immediately</span>
        </div>
        <div className="rush-intro-rule">
          <span className="rush-intro-rule-icon" aria-hidden="true">⚡</span>
          <span>Miss it and it fades — a new one takes its place</span>
        </div>
        <div className="rush-intro-rule">
          <span className="rush-intro-rule-icon" aria-hidden="true">▲</span>
          <span>Symbols shrink and vanish faster as time runs out</span>
        </div>
      </div>

      <button className="btn-primary" onClick={onStart}>Start Rush</button>
      <button className="btn-ghost" onClick={onBack}>← Back</button>
    </div>
  );
}
