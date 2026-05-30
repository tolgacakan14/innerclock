import { useState, useEffect, useRef } from 'react';

interface Props {
  onDone: () => void;
  onHome: () => void;
}

export default function RushCountdownScreen({ onDone, onHome }: Props) {
  const [count, setCount] = useState(3);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (count === 0) {
      onDoneRef.current();
      return;
    }
    // 850 ms per tick so the pop animation fully plays before the next digit
    const t = setTimeout(() => setCount(c => c - 1), 850);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div className="screen countdown-screen">
      <div className="game-header">
        <button className="home-btn" onClick={onHome} aria-label="Back to home">← Home</button>
        <span className="round-indicator">Rush Mode</span>
      </div>

      <div className="countdown-stage">
        <div
          key={count}
          className={`countdown-number count-n${count}`}
          aria-live="polite"
        >
          {count > 0 ? count : ''}
        </div>
      </div>
    </div>
  );
}
