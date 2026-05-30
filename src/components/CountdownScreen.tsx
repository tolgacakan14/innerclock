import { useState, useEffect, useRef } from 'react';

interface Props {
  roundIndex:  number;
  totalRounds: number;
  onDone:      () => void;
  onHome:      () => void;
}

export default function CountdownScreen({ roundIndex, totalRounds, onDone, onHome }: Props) {
  const [count, setCount] = useState(3);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (count === 0) {
      onDoneRef.current();
      return;
    }
    // 850 ms per number so the full pop animation plays before the next tick
    const t = setTimeout(() => setCount(c => c - 1), 850);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div className="screen countdown-screen">
      <div className="game-header">
        <button className="home-btn" onClick={onHome} aria-label="Back to home">← Home</button>
        <span className="round-indicator">Round {roundIndex + 1} of {totalRounds}</span>
      </div>

      <div className="countdown-stage">
        {/*
          key remounts the element on every count change → re-triggers CSS animation.
          count-nN class drives the progressive size + glow escalation.
        */}
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
