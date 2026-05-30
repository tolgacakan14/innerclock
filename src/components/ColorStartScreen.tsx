interface Props {
  onStart: () => void;
  onBack:  () => void;
}

export default function ColorStartScreen({ onStart, onBack }: Props) {
  return (
    <div className="screen start-screen">
      <div className="game-header">
        <button className="home-btn" onClick={onBack} aria-label="Back to home">← Home</button>
        <span className="start-mode-label">Colour Mode</span>
      </div>

      <div className="start-hero">
        <h2 className="start-title">Remember the colour.</h2>
        <p className="start-subtitle">
          Watch a colour, then match it from memory.
        </p>
      </div>

      <button className="btn-primary" onClick={onStart}>
        Start Colour Challenge
      </button>
    </div>
  );
}
