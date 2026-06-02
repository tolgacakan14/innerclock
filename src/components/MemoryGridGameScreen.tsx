import { useState, useRef, useEffect } from 'react';

// ── Round configurations ──────────────────────────────────────────────────────

interface RoundConfig { gridSize: number; cells: number; previewMs: number; }

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
];

function getConfig(round: number): RoundConfig {
  return ROUND_CONFIGS[Math.min(round - 1, ROUND_CONFIGS.length - 1)];
}

/** Fisher-Yates shuffle → returns `count` unique indices from [0, gridSize²). */
function pickCells(gridSize: number, count: number): Set<number> {
  const total   = gridSize * gridSize;
  const safeN   = Math.min(count, total);
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, safeN));
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'preview' | 'input' | 'result';

interface Props {
  onComplete: (completedRounds: number, totalCorrectCells: number, score: number) => void;
  onHome:     () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemoryGridGameScreen({ onComplete, onHome }: Props) {

  // ── React state (drives rendering) ───────────────────────────────────────
  const [round,       setRound]      = useState(1);
  const [phase,       setPhase]      = useState<Phase>('idle');
  const [targets,     setTargets]    = useState<Set<number>>(new Set());
  const [selected,    setSelected]   = useState<Set<number>>(new Set());
  const [lastCorrect, setLastCorrect] = useState(false);

  // ── Authoritative refs (no stale-closure risk) ────────────────────────────
  const phaseRef    = useRef<Phase>('idle');
  const roundRef    = useRef(1);
  const targetsRef  = useRef<Set<number>>(new Set());
  const selectedRef = useRef<Set<number>>(new Set());

  // Single timer slot — always cleared before a new timer is set.
  // This replaces the old roundIdRef pattern and is simpler + equally safe.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scoring
  const completedRef    = useRef(0);
  const totalCorrectRef = useRef(0);

  // Lifecycle flag — set to true in cleanup to stop any in-flight callbacks
  const doneRef       = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ── Audio ─────────────────────────────────────────────────────────────────
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

  function playCellTap(cellIdx: number) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
      const osc   = ctx.createOscillator();
      const gain  = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = scale[cellIdx % scale.length];
      gain.gain.setValueAtTime(0.20, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.10);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch { /* silent */ }
  }

  function playResult(correct: boolean) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const freqs = correct ? [523.25, 659.25, 783.99] : [220.00, 261.63];
      const dur   = correct ? 0.28 : 0.22;
      freqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = correct ? 'sine' : 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(correct ? 0.16 : 0.09, ctx.currentTime + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.04 + dur);
        osc.start(ctx.currentTime + i * 0.04);
        osc.stop(ctx.currentTime + i * 0.04 + dur + 0.05);
      });
    } catch { /* silent */ }
  }

  // ── Timer helpers ─────────────────────────────────────────────────────────

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  // ── Game engine ───────────────────────────────────────────────────────────

  function startRound(r: number) {
    if (doneRef.current) return;
    clearTimer(); // cancel any pending result or preview timer

    const cfg  = getConfig(r);
    const tgts = pickCells(cfg.gridSize, cfg.cells);

    // Write refs first — these are read by handlers, not from React state
    roundRef.current    = r;
    targetsRef.current  = tgts;
    selectedRef.current = new Set();
    phaseRef.current    = 'preview';

    // Flush to React state for rendering
    setRound(r);
    setTargets(new Set(tgts));  // new Set() forces diff even if same object
    setSelected(new Set());
    setLastCorrect(false);
    setPhase('preview');

    // Switch from preview → input after the preview window
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (doneRef.current) return;
      phaseRef.current = 'input';
      setPhase('input');
    }, cfg.previewMs);
  }

  // ── Mount / unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    // Reset all mutable state — safe for React Strict Mode double-invoke
    doneRef.current       = false;
    completedRef.current  = 0;
    totalCorrectRef.current = 0;

    const t = setTimeout(() => startRound(1), 400);

    return () => {
      clearTimeout(t);
      clearTimer();
      doneRef.current = true;
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tap handler ───────────────────────────────────────────────────────────

  function handleCellTap(cellIdx: number) {
    if (phaseRef.current !== 'input' || doneRef.current) return;
    if (selectedRef.current.has(cellIdx)) return; // no deselection, no double-tap

    const next = new Set(selectedRef.current);
    next.add(cellIdx);
    selectedRef.current = next;
    setSelected(new Set(next));
    playCellTap(cellIdx);

    const cfg = getConfig(roundRef.current);
    if (next.size < cfg.cells) return; // still selecting

    // ── All required cells tapped — evaluate immediately ─────────────────────
    phaseRef.current = 'result';
    setPhase('result');

    const tgts    = targetsRef.current;
    let   correct = 0;
    for (const c of next) { if (tgts.has(c)) correct++; }
    const allCorrect = correct === tgts.size;

    setLastCorrect(allCorrect);
    totalCorrectRef.current += correct;
    if (allCorrect) completedRef.current++;
    playResult(allCorrect);

    // After showing result, advance or end
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (doneRef.current) return;
      if (allCorrect) {
        startRound(roundRef.current + 1);
      } else {
        doneRef.current = true;
        const score = completedRef.current * 20 + totalCorrectRef.current * 3;
        onCompleteRef.current(completedRef.current, totalCorrectRef.current, score);
      }
    }, 1300);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const cfg      = getConfig(round);
  const gridSize = cfg.gridSize;

  function cellClass(idx: number): string {
    const cls = ['mg-cell'];
    if (phase === 'preview' && targets.has(idx))  cls.push('mg-cell--preview');
    if (phase === 'input'   && selected.has(idx)) cls.push('mg-cell--selected');
    if (phase === 'result') {
      const wasTgt = targets.has(idx);
      const wasSel = selected.has(idx);
      if      (wasTgt && wasSel) cls.push('mg-cell--correct');
      else if (wasSel)           cls.push('mg-cell--wrong');
      else if (wasTgt)           cls.push('mg-cell--missed');
    }
    return cls.join(' ');
  }

  return (
    <div className="mg-game-wrap">

      {/* Header */}
      <div className="mg-header">
        <button className="color-overlay-btn" onClick={onHome} aria-label="Back to home">
          ← Home
        </button>
        <span className="mg-round-label">
          Round {round}
          {completedRef.current > 0 && (
            <span className="mg-done-inline"> · {completedRef.current}✓</span>
          )}
        </span>
        <span className="mg-game-name">Memory Grid</span>
      </div>

      {/* Phase status */}
      <div className="mg-status-row">
        {phase === 'idle' && (
          <span className="mg-status mg-status--ready">Get ready…</span>
        )}
        {phase === 'preview' && (
          <span className="mg-status mg-status--preview">Remember the cells!</span>
        )}
        {phase === 'input' && (
          <span className="mg-status mg-status--selecting">
            Tap {cfg.cells - selected.size} more
          </span>
        )}
        {phase === 'result' && (
          <span className={`mg-status ${lastCorrect ? 'mg-status--correct' : 'mg-status--wrong'}`}>
            {lastCorrect ? '✓ Perfect!' : '✕ Wrong'}
          </span>
        )}
      </div>

      {/* Grid */}
      <div
        className="mg-grid"
        style={{ '--mg-cols': gridSize } as React.CSSProperties}
      >
        {Array.from({ length: gridSize * gridSize }, (_, i) => (
          <button
            key={`${round}-${i}`}
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
