interface Props {
  onStart: () => void;
  onBack:  () => void;
}

export default function StartScreen({ onStart, onBack }: Props) {
  return (
    <div className="screen start-screen">
      <div className="game-header">
        <button className="home-btn" onClick={onBack} aria-label="Back to home">← Home</button>
        <span className="start-mode-label">Time Mode</span>
      </div>

      <div className="start-hero">
        <h2 className="start-title">Feel the rhythm.</h2>
        <p className="start-subtitle">
          Watch the rings until they fade.<br />Recreate that duration from memory.
        </p>
      </div>

      <button className="btn-primary" onClick={onStart}>
        Start Challenge
      </button>
    </div>
  );
}
