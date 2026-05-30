interface Props {
  roundIndex:  number;   // 0–4
  patternName: string;
  score:       number;   // floor(seconds survived)
  onNext:      () => void;
  onHome:      () => void;
}

export default function GrandmaRoundResultScreen({ roundIndex, patternName, score, onNext, onHome }: Props) {
  const isLast = roundIndex === 2;

  return (
    <div className="screen grandma-round-result-screen">
      <p className="grandma-round-label-text">Round {roundIndex + 1} of 3</p>

      <p className="grandma-pattern-name">{patternName}</p>

      <div className="grandma-round-score-block">
        <span className="grandma-round-score-num">{score}</span>
        <span className="grandma-round-score-label">points</span>
      </div>

      <p className="grandma-round-sub">
        Grandma survived {score} second{score !== 1 ? 's' : ''}.
      </p>

      <button className="btn-primary" onClick={onNext}>
        {isLast ? 'See Total Score →' : 'Next Round →'}
      </button>

      <button className="btn-ghost" onClick={onHome}>← Home</button>
    </div>
  );
}
