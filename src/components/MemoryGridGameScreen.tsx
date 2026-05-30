import { useState, useRef, useEffect } from 'react';

// ── Round configurations ──────────────────────────────────────────────────────

interface RoundConfig { gridSize: number; cells: number; previewMs: number; }

const ROUND_CONFIGS: RoundConfig[] = [
  { gridSize: 3, cells: 3, previewMs: 1500 },  // round 1
  { gridSize: 3, cells: 4, previewMs: 1300 },  // round 2
  { gridSize: 3, cells: 5, previewMs: 1200 },  // round 3
  { gridSize: 4, cells: 5, previewMs: 1100 },  // round 4
  { gridSize: 4, cells: 6, previewMs: 1000 },  // round 5
  { gridSize: 4, cells: 7, previewMs:  900 },  // round 6
  { gridSize: 5, cells: 8, previewMs:  800 },  // round 7+
];

function getConfig(round: number): RoundConfig {
  return ROUND_CONFIGS[Math.min(round - 1, ROUND_CONFIGS.length - 1)];
}

/** Pick `count` random cell indices from a gridSize×gridSize grid. */
function pickCells(gridSize: number, count: number): Set<number> {
  const total   = gridSize * gridSize;
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, count));
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'ready' | 'preview' | 'selecting' | 'feedback';

interface Props {
  onComplete: (completedRounds: number, totalCorrectCells: number, score: number) => void;
  onHome:     () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemoryGridGameScreen({ onComplete, onHome }: Props) {
  const [round,         setRound]         = useState(1);
  const [phase,         setPhase]         = useState<Phase>('ready');
  const [targetCells,   setTargetCells]   = useState<Set<number>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set());
  const [allCorrect,    setAllCorrect]    = useState(false);

  const completedRef    = useRef(0);
  const totalCorrectRef = useRef(0);
  const doneRef         = useRef(false);
  const timersRef       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef   = useRef(onComplete);
  onCompleteRef.current = onComplete;
  // Keep a ref for the current round so submitSelection can read it without stale closure
  const roundRef        = useRef(1);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function beginRound(r: number) {
    if (doneRef.current) return;
    clearTimers();
    roundRef.current = r;
    const cfg   = getConfig(r);
    const cells = pickCells(cfg.gridSize, cfg.cells);
    setTargetCells(cells);
    setSelectedCells(new Set());
    setAllCorrect(false);
    setPhase('preview');

    const t = setTimeout(() => {
      setPhase('selecting');
    }, cfg.previewMs);
    timersRef.current.push(t);
  }

  useEffect(() => {
    const t = setTimeout(() => beginRound(1), 500);
    return () => { clearTimeout(t); clearTimers(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tap handler ───────────────────────────────────────────────────────────

  function handleCellTap(cellIdx: number) {
    if (phase !== 'selecting' || doneRef.current) return;

    const next = new Set(selectedCells);
    if (next.has(cellIdx)) {
      next.delete(cellIdx);
    } else {
      next.add(cellIdx);
    }
    setSelectedCells(next);

    const cfg = getConfig(roundRef.current);
    if (next.size === cfg.cells) {
      submitSelection(next);
    }
  }

  function submitSelection(selection: Set<number>) {
    setPhase('feedback');

    let correct = 0;
    for (const c of selection) {
      if (targetCells.has(c)) correct++;
    }
    const roundAllCorrect = correct === getConfig(roundRef.current).cells;

    totalCorrectRef.current += correct;
    if (roundAllCorrect) completedRef.current++;

    setAllCorrect(roundAllCorrect);

    const t = setTimeout(() => {
      if (roundAllCorrect) {
        const nextRound = roundRef.current + 1;
        setRound(nextRound);
        beginRound(nextRound);
      } else {
        // Game over
        doneRef.current = true;
        const score = completedRef.current * 20 + totalCorrectRef.current * 3;
        onCompleteRef.current(completedRef.current, totalCorrectRef.current, score);
      }
    }, 1400);
    timersRef.current.push(t);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const cfg        = getConfig(round);
  const gridSize   = cfg.gridSize;
  const totalCells = gridSize * gridSize;

  function cellClass(idx: number): string {
    const classes = ['mg-cell'];
    if (phase === 'preview' && targetCells.has(idx)) classes.push('mg-cell--preview');
    if (phase === 'selecting' && selectedCells.has(idx)) classes.push('mg-cell--selected');
    if (phase === 'feedback') {
      const wasTarget   = targetCells.has(idx);
      const wasSelected = selectedCells.has(idx);
      if (wasTarget && wasSelected)  classes.push('mg-cell--correct');
      else if (!wasTarget && wasSelected) classes.push('mg-cell--wrong');
      else if (wasTarget && !wasSelected) classes.push('mg-cell--missed');
    }
    return classes.join(' ');
  }

  return (
    <div className="mg-game-wrap">

      {/* Header */}
      <div className="mg-header">
        <button className="color-overlay-btn" onClick={onHome} aria-label="Back to home">
          ← Home
        </button>
        <span className="mg-round-label">Round {round}</span>
        <span className="mg-completed-count">{completedRef.current} ✓</span>
      </div>

      {/* Phase status */}
      <div className="mg-status-row">
        {phase === 'ready'     && <span className="mg-status mg-status--ready">Get ready…</span>}
        {phase === 'preview'   && <span className="mg-status mg-status--preview">Remember the cells!</span>}
        {phase === 'selecting' && (
          <span className="mg-status mg-status--selecting">
            Tap {cfg.cells - selectedCells.size} more
          </span>
        )}
        {phase === 'feedback' && (
          <span className={`mg-status ${allCorrect ? 'mg-status--correct' : 'mg-status--wrong'}`}>
            {allCorrect ? '✓ Perfect!' : '✕ Wrong'}
          </span>
        )}
      </div>

      {/* Grid */}
      <div
        className="mg-grid"
        style={{ '--mg-cols': gridSize } as React.CSSProperties}
      >
        {Array.from({ length: totalCells }, (_, i) => (
          <button
            key={i}
            className={cellClass(i)}
            onPointerDown={() => handleCellTap(i)}
            aria-label={`Cell ${i + 1}`}
          />
        ))}
      </div>

      {/* Round info */}
      <div className="mg-info-row">
        <span className="mg-info-text">
          {gridSize}×{gridSize} grid — find {cfg.cells} cells
        </span>
      </div>

    </div>
  );
}
