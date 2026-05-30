interface Props {
  roundIndex:  number;
  boardName:   string;
  solveTime:   number;   // seconds
  mistakes:    number;
  totalArrows: number;
  isLast:      boolean;
  onNext:      () => void;
  onHome:      () => void;
}

export default function ArrowEscapeRoundResultScreen({
  roundIndex, boardName, solveTime, mistakes, totalArrows, isLast, onNext, onHome,
}: Props) {
  const fmtTime = (s: number) => s.toFixed(1) + 's';

  return (
    <div className="screen feedback-screen ae-round-result">
      <div className="game-header">
        <button className="home-btn" onClick={onHome}>← Home</button>
        <span className="round-indicator">Round {roundIndex + 1} of 5</span>
      </div>

      <p className="ae-rr-board-name">{boardName}</p>

      <div className="feedback-big-score">
        <span className="feedback-score-num">{fmtTime(solveTime)}</span>
        <span className="feedback-score-label"> solve time</span>
      </div>

      <div className="feedback-rows">
        <div className="feedback-row">
          <span>Arrows cleared</span>
          <span className="ae-stat-good">{totalArrows} / {totalArrows}</span>
        </div>
        <div className="feedback-row">
          <span>Wrong attempts</span>
          <span className={mistakes > 0 ? 'ae-stat-bad' : ''}>{mistakes}</span>
        </div>
      </div>

      <button className="btn-primary" onClick={onNext}>
        {isLast ? 'See Results →' : 'Next Board →'}
      </button>
      <button className="btn-ghost" onClick={onHome} style={{ marginTop: 8 }}>← Home</button>
    </div>
  );
}
