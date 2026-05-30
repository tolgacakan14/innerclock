interface Props {
  courseIndex: number;   // 0–4
  courseName:  string;
  shots:       number;
  onNext:      () => void;
}

export default function GolfRoundCompleteScreen({ courseIndex, courseName, shots, onNext }: Props) {
  const isLast      = courseIndex === 4;
  const isHoleInOne = shots === 1;

  return (
    <div className="screen golf-round-complete-screen">
      <p className="golf-round-label">Course {courseIndex + 1} of 5</p>

      <h2 className="golf-course-name">{courseName}</h2>

      {isHoleInOne ? (
        <div className="golf-hole-in-one-block">
          <span className="golf-hole-in-one-icon">⛳</span>
          <p className="golf-hole-in-one-text">Hole in one!</p>
          <div className="golf-round-score-block">
            <span className="golf-round-shots">{shots}</span>
            <span className="golf-round-shots-label">shot</span>
          </div>
        </div>
      ) : (
        <div className="golf-round-score-block">
          <span className="golf-round-shots">{shots}</span>
          <span className="golf-round-shots-label">{shots === 1 ? 'shot' : 'shots'}</span>
        </div>
      )}

      <button className="btn-primary" onClick={onNext}>
        {isLast ? 'See Final Score →' : 'Next Course →'}
      </button>
    </div>
  );
}
