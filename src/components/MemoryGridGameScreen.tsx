import { useState, useRef, useEffect } from 'react';

// ── Round configurations ──────────────────────────────────────────────────────

interface RoundConfig { gridSize: number; cells: number; previewMs: number; }

// 45 round configs covering 5 escalating phases.
// After round 45 the last config repeats (see getConfig).
//
//  Phase 1 — Rounds  1– 3: 3×3 intro       (3 entries)
//  Phase 2 — Rounds  4– 7: 4×4 warm-up     (4 entries)
//  Phase 3 — Rounds  8–17: 5×5 intermediate (10 entries)
//  Phase 4 — Rounds 18–28: 6×6 advanced    (11 entries)
//  Phase 5 — Rounds 29–38: 7×7 hard        (10 entries)
//  Phase 6 — Rounds 39–45: 8×8 expert      ( 7 entries)
const ROUND_CONFIGS: RoundConfig[] = [
  // ── Phase 1: 3×3 ─────────────────────────────────────────────────────────
  { gridSize: 3, cells: 3, previewMs: 1500 },  // 1
  { gridSize: 3, cells: 4, previewMs: 1300 },  // 2
  { gridSize: 3, cells: 5, previewMs: 1200 },  // 3
  // ── Phase 2: 4×4 ─────────────────────────────────────────────────────────
  { gridSize: 4, cells: 5, previewMs: 1100 },  // 4
  { gridSize: 4, cells: 6, previewMs: 1000 },  // 5
  { gridSize: 4, cells: 7, previewMs:  900 },  // 6
  { gridSize: 4, cells: 8, previewMs:  850 },  // 7
  // ── Phase 3: 5×5 ─────────────────────────────────────────────────────────
  { gridSize: 5, cells:  8, previewMs: 800 },  // 8
  { gridSize: 5, cells:  9, previewMs: 780 },  // 9
  { gridSize: 5, cells: 10, previewMs: 750 },  // 10
  { gridSize: 5, cells: 11, previewMs: 720 },  // 11
  { gridSize: 5, cells: 12, previewMs: 700 },  // 12
  { gridSize: 5, cells: 13, previewMs: 680 },  // 13
  { gridSize: 5, cells: 14, previewMs: 650 },  // 14
  { gridSize: 5, cells: 15, previewMs: 630 },  // 15
  { gridSize: 5, cells: 16, previewMs: 610 },  // 16
  { gridSize: 5, cells: 17, previewMs: 590 },  // 17
  // ── Phase 4: 6×6 ─────────────────────────────────────────────────────────
  { gridSize: 6, cells: 12, previewMs: 700 },  // 18
  { gridSize: 6, cells: 13, previewMs: 680 },  // 19
  { gridSize: 6, cells: 14, previewMs: 660 },  // 20
  { gridSize: 6, cells: 15, previewMs: 640 },  // 21
  { gridSize: 6, cells: 16, previewMs: 620 },  // 22
  { gridSize: 6, cells: 17, previewMs: 600 },  // 23
  { gridSize: 6, cells: 18, previewMs: 580 },  // 24
  { gridSize: 6, cells: 19, previewMs: 560 },  // 25
  { gridSize: 6, cells: 20, previewMs: 540 },  // 26
  { gridSize: 6, cells: 21, previewMs: 520 },  // 27
  { gridSize: 6, cells: 22, previewMs: 500 },  // 28
  // ── Phase 5: 7×7 ─────────────────────────────────────────────────────────
  { gridSize: 7, cells: 16, previewMs: 580 },  // 29
  { gridSize: 7, cells: 17, previewMs: 560 },  // 30
  { gridSize: 7, cells: 18, previewMs: 540 },  // 31
  { gridSize: 7, cells: 19, previewMs: 520 },  // 32
  { gridSize: 7, cells: 20, previewMs: 500 },  // 33
  { gridSize: 7, cells: 22, previewMs: 480 },  // 34
  { gridSize: 7, cells: 24, previewMs: 460 },  // 35
  { gridSize: 7, cells: 26, previewMs: 440 },  // 36
  { gridSize: 7, cells: 28, previewMs: 420 },  // 37
  { gridSize: 7, cells: 30, previewMs: 400 },  // 38
  // ── Phase 6: 8×8 ─────────────────────────────────────────────────────────
  { gridSize: 8, cells: 20, previewMs: 480 },  // 39
  { gridSize: 8, cells: 22, previewMs: 460 },  // 40
  { gridSize: 8, cells: 24, previewMs: 440 },  // 41
  { gridSize: 8, cells: 26, previewMs: 420 },  // 42
  { gridSize: 8, cells: 28, previewMs: 400 },  // 43
  { gridSize: 8, cells: 30, previewMs: 380 },  // 44
  { gridSize: 8, cells: 32, previewMs: 360 },  // 45+
];

function getConfig(round: number): RoundConfig {
  return ROUND_CONFIGS[Math.min(round - 1, ROUND_CONFIGS.length - 1)];
}

/** Pick `count` random cell indices from a gridSize×gridSize grid. */
function pickCells(gridSize: number, count: number): Set<number> {
  const total   = gridSize * gridSize;
  // Guard: never request more cells than available
  const safeCount = Math.min(count, total);
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, safeCount));
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'ready' | 'preview' | 'selecting' | 'feedback';

interface Props {
  onComplete: (completedRounds: number, totalCorrectCells: number, score: number) => void;
  onHome:     () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemoryGridGameScreen({ onComplete, onHome }: Props) {
  // ── React state — drives rendering only ──────────────────────────────────
  const [round,         setRound]         = useState(1);
  const [phase,         setPhase]         = useState<Phase>('ready');
  const [targetCells,   setTargetCells]   = useState<Set<number>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set());
  const [allCorrect,    setAllCorrect]    = useState(false);

  // ── Refs — authoritative mutable game state, no stale-closure risk ────────
  const phaseRef         = useRef<Phase>('ready');
  const targetCellsRef   = useRef<Set<number>>(new Set());
  const selectedCellsRef = useRef<Set<number>>(new Set());
  const roundRef         = useRef(1);

  const completedRef    = useRef(0);
  const totalCorrectRef = useRef(0);
  const doneRef         = useRef(false);
  const timersRef       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef   = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ── Web Audio ─────────────────────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioCtx(): AudioContext | null {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext ?? (window as any).webkitAudioContext)();
      } catch { return null; }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }

  /** Brief tap tick — pentatonic scale mapped to cell index */
  function playCellTap(cellIdx: number) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
      const freq  = scale[cellIdx % scale.length];
      const osc   = ctx.createOscillator();
      const gain  = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.10);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch { /* silent */ }
  }

  /** Result chord — major for correct, minor low for wrong */
  function playResult(correct: boolean) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const freqs = correct ? [523.25, 659.25, 783.99] : [220.00, 261.63];
      const dur   = correct ? 0.30 : 0.25;
      freqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = correct ? 'sine' : 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(correct ? 0.18 : 0.10, ctx.currentTime + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.04 + dur);
        osc.start(ctx.currentTime + i * 0.04);
        osc.stop(ctx.currentTime + i * 0.04 + dur + 0.05);
      });
    } catch { /* silent */ }
  }

  // ── Helpers to keep ref + state in sync ──────────────────────────────────

  function setPhaseSync(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  // ── Round lifecycle ───────────────────────────────────────────────────────

  function beginRound(r: number) {
    if (doneRef.current) return;
    clearTimers();

    roundRef.current = r;
    const cfg   = getConfig(r);
    const cells = pickCells(cfg.gridSize, cfg.cells);

    // Update both refs and state atomically-as-possible
    targetCellsRef.current   = cells;
    selectedCellsRef.current = new Set();

    setRound(r);
    setTargetCells(new Set(cells));   // new Set so React always sees a change
    setSelectedCells(new Set());
    setAllCorrect(false);
    setPhaseSync('preview');

    const t = setTimeout(() => {
      if (doneRef.current) return;
      setPhaseSync('selecting');
    }, cfg.previewMs);
    timersRef.current.push(t);
  }

  useEffect(() => {
    const t = setTimeout(() => beginRound(1), 500);
    return () => {
      clearTimeout(t);
      clearTimers();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tap handler — reads from refs to avoid stale closures ────────────────

  function handleCellTap(cellIdx: number) {
    if (phaseRef.current !== 'selecting' || doneRef.current) return;
    playCellTap(cellIdx);

    const prev = selectedCellsRef.current;
    if (prev.has(cellIdx)) {
      // Toggle: deselect
      const next = new Set(prev);
      next.delete(cellIdx);
      selectedCellsRef.current = next;
      setSelectedCells(new Set(next));
      return;
    }

    const next = new Set(prev);
    next.add(cellIdx);
    selectedCellsRef.current = next;
    setSelectedCells(new Set(next));

    const cfg = getConfig(roundRef.current);
    if (next.size === cfg.cells) {
      submitSelection(next);
    }
  }

  function submitSelection(selection: Set<number>) {
    // Guard: prevent double-submit (e.g. two rapid final taps)
    if (phaseRef.current !== 'selecting') return;
    setPhaseSync('feedback');

    const targets = targetCellsRef.current;   // always fresh via ref
    let correct = 0;
    for (const c of selection) {
      if (targets.has(c)) correct++;
    }
    const cfg = getConfig(roundRef.current);
    const roundAllCorrect = correct === cfg.cells;
    playResult(roundAllCorrect);

    totalCorrectRef.current += correct;
    if (roundAllCorrect) completedRef.current++;

    setAllCorrect(roundAllCorrect);

    const t = setTimeout(() => {
      if (doneRef.current) return;
      if (roundAllCorrect) {
        beginRound(roundRef.current + 1);
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
      if (wasTarget && wasSelected)   classes.push('mg-cell--correct');
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
        <span className="mg-round-label">Round {round} <span className="mg-done-inline">{completedRef.current > 0 ? `· ${completedRef.current}✓` : ''}</span></span>
        <span className="mg-game-name">Memory Grid</span>
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
