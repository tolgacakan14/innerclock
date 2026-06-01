interface Props {
  roundIndex:       number;   // 0–2
  score:            number;   // floor(seconds survived)
  diedAtLevelName?: string;   // e.g. 'Last Dance', 'Virgin Mode'
  onNext:           () => void;
  onHome:           () => void;
}

export default function GrandmaRoundResultScreen({ roundIndex, score, diedAtLevelName, onNext, onHome }: Props) {
  const isLast = roundIndex === 2;

  return (
    <div className="screen grandma-round-result-screen">
      <p className="grandma-game-title-label">Grandma Walking</p>

      <p className="grandma-round-label-text">Round {roundIndex + 1} of 3</p>

      {diedAtLevelName && (
        <p className="grandma-died-at-level">
          Died in <span className="grandma-died-level-name">{diedAtLevelName}</span>
        </p>
      )}

      <div className="grandma-round-score-block">
        <span className="grandma-round-score-num">{score}</span>
        <span className="grandma-round-score-label">seconds survived</span>
      </div>

      <p className="grandma-round-sub">
        {score < 10
          ? 'Better luck next round!'
          : score < 30
          ? 'Solid effort.'
          : score < 50
          ? 'Impressive endurance!'
          : 'Legendary survivor!'}
      </p>

      <button className="btn-primary" onClick={onNext}>
        {isLast ? 'See Total Score →' : 'Next Round →'}
      </button>

      <button className="btn-ghost" onClick={onHome}>← Home</button>
    </div>
  );
}
