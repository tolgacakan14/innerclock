import { useState, useRef, useEffect } from 'react';
import { musicManager } from '../audio';

// ── Constants ─────────────────────────────────────────────────────────────────

const TILE_COLORS = [
  '#FF453A', // red
  '#FF9F0A', // orange
  '#30D158', // green
  '#5AC8F5', // cyan
  '#BF5AF2', // purple
  '#FFD60A', // yellow
];

/** Musical pitches per tile — pentatonic scale for pleasant chords. */
const TILE_FREQS = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.5];

// ── Web Audio beep helper ─────────────────────────────────────────────────────

function playBeep(
  tileIndex: number,
  ctx: AudioContext,
  volume = 0.35,
  dur = 0.15,
) {
  try {
    const freq = TILE_FREQS[tileIndex] ?? 440;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  } catch (_) { /* audio not available — silently skip */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sequence length grows by 1 each level, starting at 3. */
function seqLen(level: number): number { return Math.min(2 + level, 12); }

/** Flash duration per tile (ms) — decreases every 2 levels. */
function flashMs(level: number): number {
  const tier = Math.floor((level - 1) / 2);
  return Math.max(280, 720 - tier * 80);
}

/** Gap between flashes (ms) */
function gapMs(level: number): number {
  const tier = Math.floor((level - 1) / 2);
  return Math.max(80, 200 - tier * 20);
}

/** Generate a sequence of tile indices (no two consecutive same tile). */
function generateSeq(len: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < len; i++) {
    let next: number;
    do { next = Math.floor(Math.random() * TILE_COLORS.length); }
    while (i > 0 && next === seq[i - 1]);
    seq.push(next);
  }
  return seq;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'showing' | 'input' | 'correct' | 'wrong';

interface Props {
  onComplete: (completedLevels: number, maxSeqLen: number, score: number, elapsedTime: number) => void;
  onHome:     () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SequenceTapGameScreen({ onComplete, onHome }: Props) {
  const [phase,         setPhase]         = useState<Phase>('idle');
  const [level,         setLevel]         = useState(1);
  const [sequence,      setSequence]      = useState<number[]>([]);
  const [activeIdx,     setActiveIdx]     = useState(-1);   // currently lit tile (demo)
  const [pressedTile,   setPressedTile]   = useState(-1);   // briefly lit on player tap
  const [inputProgress, setInputProgress] = useState<number[]>([]);
  const [wrongTileIdx,  setWrongTileIdx]  = useState(-1);

  const pressedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const completedRef  = useRef(0);
  const maxSeqLenRef  = useRef(0);
  const doneRef       = useRef(false);
  const levelRef      = useRef(1);
  const timersRef     = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // ── Web Audio ─────────────────────────────────────────────────────────────
  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioCtx(): AudioContext | null {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext ?? (window as any).webkitAudioContext)();
      } catch (_) { return null; }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }

  function beep(tileIdx: number, vol = 0.35) {
    if (!musicManager.enabled) return;   // respect global audio toggle
    const ctx = getAudioCtx();
    if (!ctx) return;
    // AudioContext.resume() is async — wait for it before scheduling nodes,
    // otherwise the oscillator silently drops on the first tap (iOS / Chrome).
    if (ctx.state === 'running') {
      playBeep(tileIdx, ctx, vol);
    } else {
      ctx.resume().then(() => playBeep(tileIdx, ctx, vol)).catch(() => {});
    }
  }

  // ── Elapsed time ──────────────────────────────────────────────────────────
  const startTimeRef = useRef<number>(0);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function startLevel(lv: number) {
    clearTimers();
    levelRef.current = lv;
    const len  = seqLen(lv);
    const seq  = generateSeq(len);
    setSequence(seq);
    setInputProgress([]);
    setActiveIdx(-1);
    setWrongTileIdx(-1);
    setPhase('showing');

    const flash = flashMs(lv);
    const gap   = gapMs(lv);
    let   t     = 700; // initial pause before first flash

    for (let i = 0; i < len; i++) {
      const idx = seq[i];
      const t1 = setTimeout(() => {
        setActiveIdx(idx);
        beep(idx, 0.22); // softer beep during demo
      }, t);
      t += flash;
      const t2 = setTimeout(() => setActiveIdx(-1), t);
      t += gap;
      timersRef.current.push(t1, t2);
    }

    const tEnd = setTimeout(() => {
      setInputProgress([]);
      setPhase('input');
    }, t);
    timersRef.current.push(tEnd);
  }

  // Start game on mount
  useEffect(() => {
    startTimeRef.current = performance.now();
    const t = setTimeout(() => startLevel(1), 500);
    return () => {
      clearTimeout(t);
      clearTimers();
      if (pressedTimerRef.current) clearTimeout(pressedTimerRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tap handler ───────────────────────────────────────────────────────────

  function handleTileTap(tileIndex: number) {
    if (phase !== 'input' || doneRef.current) return;

    // Lazy-init AudioContext on first real user gesture
    getAudioCtx();

    // ── Instant visual feedback: light up the tapped tile ─────────────────────
    if (pressedTimerRef.current) clearTimeout(pressedTimerRef.current);
    setPressedTile(tileIndex);
    pressedTimerRef.current = setTimeout(() => setPressedTile(-1), 160);

    const expected = sequence[inputProgress.length];

    if (tileIndex !== expected) {
      // Wrong tap — game over
      beep(tileIndex, 0.25);
      setWrongTileIdx(tileIndex);
      setPhase('wrong');
      doneRef.current = true;
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const score = completedRef.current * 10 + maxSeqLenRef.current * 5;
      const tid = setTimeout(() => {
        onCompleteRef.current(completedRef.current, maxSeqLenRef.current, score, +elapsed.toFixed(1));
      }, 1000);
      timersRef.current.push(tid);
      return;
    }

    beep(tileIndex, 0.35); // correct tap beep

    const newProgress = [...inputProgress, tileIndex];
    setInputProgress(newProgress);

    if (newProgress.length === sequence.length) {
      // Sequence complete — level up
      completedRef.current++;
      maxSeqLenRef.current = Math.max(maxSeqLenRef.current, sequence.length);
      setPhase('correct');
      const nextLv = levelRef.current + 1;
      const tid = setTimeout(() => {
        setLevel(nextLv);
        startLevel(nextLv);
      }, 800);
      timersRef.current.push(tid);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showDots = phase === 'input' || phase === 'correct' || phase === 'wrong';

  return (
    <div className="seq-game-wrap">

      {/* Header */}
      <div className="seq-header">
        <button className="color-overlay-btn" onClick={onHome} aria-label="Back to home">
          ← Home
        </button>
        <span className="seq-level-label">Level {level} <span className="seq-done-inline">{completedRef.current > 0 ? `· ${completedRef.current}✓` : ''}</span></span>
        <span className="seq-game-name">Sequence Tap</span>
      </div>

      {/* Phase status */}
      <div className="seq-status-row">
        {phase === 'idle'    && <span className="seq-status seq-status--idle">Get ready…</span>}
        {phase === 'showing' && <span className="seq-status seq-status--showing">Watch the sequence</span>}
        {phase === 'input'   && <span className="seq-status seq-status--input">Your turn!</span>}
        {phase === 'correct' && <span className="seq-status seq-status--correct">✓ Correct!</span>}
        {phase === 'wrong'   && <span className="seq-status seq-status--wrong">✕ Wrong!</span>}
      </div>

      {/* Progress dots */}
      {showDots && (
        <div className="seq-progress-dots">
          {sequence.map((_, i) => {
            const isDone  = i < inputProgress.length;
            const isWrong = phase === 'wrong' && i === inputProgress.length - 1 && isDone;
            return (
              <div
                key={i}
                className={[
                  'seq-dot',
                  isDone  ? (isWrong ? 'seq-dot--wrong' : 'seq-dot--done') : '',
                  !isDone && i === inputProgress.length ? 'seq-dot--next' : '',
                ].filter(Boolean).join(' ')}
              />
            );
          })}
        </div>
      )}

      {/* Tile grid — 3 × 2 */}
      <div className="seq-tiles-grid">
        {TILE_COLORS.map((color, i) => {
          const isActive  = activeIdx === i;
          const isPressed = pressedTile === i && phase === 'input' && !isActive;
          const isWrong   = wrongTileIdx === i && phase === 'wrong';
          return (
            <button
              key={i}
              className={[
                'seq-tile',
                isActive  ? 'seq-tile--active'  : '',
                isPressed ? 'seq-tile--pressed'  : '',
                isWrong   ? 'seq-tile--wrong'    : '',
              ].filter(Boolean).join(' ')}
              style={{ '--seq-color': color } as React.CSSProperties}
              onPointerDown={() => handleTileTap(i)}
              aria-label={`Tile ${i + 1}`}
            />
          );
        })}
      </div>

      {/* Info row */}
      <div className="seq-info-row">
        <span className="seq-info-text">Sequence length: {seqLen(level)}</span>
      </div>

    </div>
  );
}
