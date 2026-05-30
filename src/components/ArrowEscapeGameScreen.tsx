import { useState, useEffect, useRef, useCallback } from 'react';
import type { ArrowBoard, ArrowItem, ArrowDir } from '../data/arrowEscapeBoards';

// ── Types ─────────────────────────────────────────────────────────────────────
type ArrowState = 'idle' | 'escaping' | 'blocked';

interface LiveArrow extends ArrowItem {
  state:       ArrowState;
  escapingTo?: ArrowDir;
}

interface FeedbackPop {
  id:   number;
  row:  number;
  col:  number;
  text: string;
  type: 'escape' | 'blocked';
}

interface Props {
  board:      ArrowBoard;
  roundIndex: number;
  onComplete: (solveTime: number, mistakes: number) => void;
  onHome:     () => void;
}

// ── Arrow SVG ─────────────────────────────────────────────────────────────────
function ArrowSVG({ dir, color, state }: { dir: ArrowDir; color: string; state: ArrowState }) {
  const rot  = dir === 'up' ? 0 : dir === 'right' ? 90 : dir === 'down' ? 180 : 270;
  const fill = state === 'blocked'  ? '#FF453A'
             : state === 'escaping' ? '#ffffff'
             : color;
  const isValid = state === 'idle'; // for glow ring
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" fill="none"
      style={{ transform: `rotate(${rot}deg)`, display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      {isValid && (
        <circle cx="16" cy="16" r="15" stroke={color} strokeWidth="1.4"
          strokeOpacity="0.35" fill="none" />
      )}
      <path d="M16 3 L24 13 L20 13 L20 29 L12 29 L12 13 L8 13 Z" fill={fill} />
    </svg>
  );
}

// ── Escape-path check ─────────────────────────────────────────────────────────
function canEscape(arrow: ArrowItem, liveArrows: ArrowItem[]): boolean {
  const { row, col, dir } = arrow;
  return !liveArrows.some(a => {
    if (a.id === arrow.id) return false;
    switch (dir) {
      case 'up':    return a.col === col && a.row < row;
      case 'down':  return a.col === col && a.row > row;
      case 'left':  return a.row === row && a.col < col;
      case 'right': return a.row === row && a.col > col;
    }
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ArrowEscapeGameScreen({
  board, roundIndex, onComplete, onHome,
}: Props) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [arrows,       setArrows]       = useState<LiveArrow[]>(() =>
    board.arrows.map(a => ({ ...a, state: 'idle' as const }))
  );
  const [pops,         setPops]         = useState<FeedbackPop[]>([]);
  const [boardCleared, setBoardCleared] = useState(false);
  const [inputLocked,  setInputLocked]  = useState(false);

  // Countdown
  const [countdown,       setCountdown]       = useState(3);
  const [countdownActive, setCountdownActive] = useState(true);

  // Timer display
  const [elapsed,    setElapsed]    = useState(0);

  // Mutable refs
  const startTimeRef  = useRef<number>(0);
  const mistakesRef   = useRef(0);
  const doneRef       = useRef(false);
  const timerActiveRef = useRef(false);
  const rafRef        = useRef<number>(0);

  // ── Timer RAF ─────────────────────────────────────────────────────────────
  // Always reschedule — only update the elapsed state when the timer is active.
  // Previously the tick returned early (without rescheduling) during the
  // countdown, killing the loop before it ever had a chance to count.
  useEffect(() => {
    function tick() {
      if (timerActiveRef.current) {
        setElapsed((performance.now() - startTimeRef.current) / 1000);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Countdown 3-2-1 ────────────────────────────────────────────────────────
  useEffect(() => {
    const t1 = setTimeout(() => setCountdown(2), 900);
    const t2 = setTimeout(() => setCountdown(1), 1800);
    const t3 = setTimeout(() => {
      setCountdown(0);
      setCountdownActive(false);
      startTimeRef.current = performance.now();
      timerActiveRef.current = true;
    }, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // ── Check board clear ───────────────────────────────────────────────────────
  const checkBoardClear = useCallback((remaining: LiveArrow[]) => {
    const active = remaining.filter(a => a.state !== 'escaping');
    if (active.length === 0 && !doneRef.current) {
      timerActiveRef.current = false;
      // Capture once — same value used for display, overlay, and submission.
      const solveTime = (performance.now() - startTimeRef.current) / 1000;
      setElapsed(solveTime);          // sync display to exact finish time
      setBoardCleared(true);
      doneRef.current = true;
      setTimeout(() => {
        onCompleteRef.current(+solveTime.toFixed(2), mistakesRef.current);
      }, 900);
    }
  }, []);

  // ── Handle tap ──────────────────────────────────────────────────────────────
  const handleTap = useCallback((arrowId: number) => {
    if (inputLocked || countdownActive || doneRef.current) return;

    setArrows(prev => {
      const arrow = prev.find(a => a.id === arrowId);
      if (!arrow || arrow.state !== 'idle') return prev;

      const liveOnly = prev.filter(a => a.state === 'idle');

      if (canEscape(arrow, liveOnly)) {
        // ── Valid escape ───────────────────────────────────────────────────
        setPops(ps => [...ps.slice(-12), {
          id: performance.now() + Math.random(),
          row: arrow.row, col: arrow.col,
          text: '✓', type: 'escape',
        }]);

        const next = prev.map(a =>
          a.id === arrowId ? { ...a, state: 'escaping' as const, escapingTo: arrow.dir } : a
        );
        setTimeout(() => {
          setArrows(after => {
            const trimmed = after.filter(a => a.id !== arrowId);
            checkBoardClear(trimmed);
            return trimmed;
          });
        }, 360);
        return next;

      } else {
        // ── Blocked ────────────────────────────────────────────────────────
        mistakesRef.current++;

        setPops(ps => [...ps.slice(-12), {
          id: performance.now() + Math.random(),
          row: arrow.row, col: arrow.col,
          text: '✕', type: 'blocked',
        }]);

        setInputLocked(true);
        const next = prev.map(a =>
          a.id === arrowId ? { ...a, state: 'blocked' as const } : a
        );
        setTimeout(() => {
          setArrows(after => after.map(a =>
            a.id === arrowId ? { ...a, state: 'idle' as const } : a
          ));
          setInputLocked(false);
        }, 520);
        return next;
      }
    });
  }, [inputLocked, countdownActive, checkBoardClear]);

  // ── Render ──────────────────────────────────────────────────────────────────
  const maxW    = Math.min(window.innerWidth, 480);
  const cellSize = Math.min(Math.floor((maxW - 36) / board.gridSize), 68);
  const boardPx  = cellSize * board.gridSize + (board.gridSize - 1) * 5;

  function escapeStyle(arrow: LiveArrow): React.CSSProperties {
    if (arrow.state !== 'escaping') return {};
    const dist = boardPx + 100;
    const map: Record<ArrowDir, string> = {
      up:    `translateY(-${dist}px)`,
      down:  `translateY(${dist}px)`,
      left:  `translateX(-${dist}px)`,
      right: `translateX(${dist}px)`,
    };
    return {
      transform: map[arrow.dir],
      opacity: 0,
      transition: 'transform 0.36s cubic-bezier(0.4,0,0.2,1), opacity 0.36s',
    };
  }

  const fmtTime = (s: number) => s.toFixed(2) + 's';
  const remainCount = arrows.filter(a => a.state === 'idle').length;

  return (
    <div className="ae-game-wrap">
      {/* Header */}
      <div className="ae-game-header">
        <button className="color-overlay-btn" onClick={onHome}
          style={{ pointerEvents: 'auto', color: 'rgba(255,255,255,0.55)' }}>
          ← Home
        </button>
        <span className="ae-round-label">Round {roundIndex + 1} / 3</span>
        <span className="ae-timer-live">{fmtTime(elapsed)}</span>
      </div>

      {/* Board name + arrow count */}
      <div className="ae-board-meta">
        <span className="ae-board-name">{board.name}</span>
        <span className="ae-arrows-remain">{remainCount} left</span>
      </div>

      {/* Arrow grid */}
      <div className="ae-board-container">
        <div
          className="ae-board"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${board.gridSize}, ${cellSize}px)`,
            gridTemplateRows:    `repeat(${board.gridSize}, ${cellSize}px)`,
            gap: '5px',
            position: 'relative',
          }}
        >
          {/* Cell backgrounds */}
          {Array.from({ length: board.gridSize * board.gridSize }, (_, i) => {
            const r = Math.floor(i / board.gridSize);
            const c = i % board.gridSize;
            return (
              <div key={`cell-${r}-${c}`} className="ae-cell-bg"
                style={{ gridColumn: c + 1, gridRow: r + 1, width: cellSize, height: cellSize }} />
            );
          })}

          {/* Live arrows */}
          {arrows.map(arrow => (
            <div
              key={arrow.id}
              className={['ae-arrow', `ae-arrow--${arrow.state}`].join(' ')}
              style={{
                gridColumn: arrow.col + 1,
                gridRow:    arrow.row + 1,
                width:      cellSize,
                height:     cellSize,
                '--ae-color': arrow.color,
                ...escapeStyle(arrow),
              } as React.CSSProperties}
              onPointerDown={e => { e.preventDefault(); handleTap(arrow.id); }}
              role="button"
              aria-label={`${arrow.dir} arrow`}
            >
              <ArrowSVG dir={arrow.dir} color={arrow.color} state={arrow.state} />
            </div>
          ))}

          {/* Feedback pops */}
          {pops.map(pop => (
            <div
              key={pop.id}
              className={`ae-pop ae-pop--${pop.type}`}
              style={{ gridColumn: pop.col + 1, gridRow: pop.row + 1 } as React.CSSProperties}
              onAnimationEnd={() => setPops(ps => ps.filter(p => p.id !== pop.id))}
            >
              {pop.text}
            </div>
          ))}
        </div>
      </div>

      {/* Board cleared overlay */}
      {boardCleared && (
        <div className="ae-board-cleared">
          <span className="ae-cleared-text">Cleared!</span>
          <span className="ae-cleared-time">{fmtTime(elapsed)}</span>
        </div>
      )}

      {/* Countdown overlay */}
      {countdownActive && (
        <div className="grandma-countdown-overlay">
          <span key={countdown} className={`grandma-countdown-num count-n${countdown}`}>
            {countdown}
          </span>
        </div>
      )}
    </div>
  );
}
