/**
 * InnerClock — Background Music Manager
 *
 * Singleton that owns the single HTMLAudioElement for background music.
 * Supports multiple named tracks and cross-fading between them.
 * Persists the user's on/off preference in localStorage.
 *
 * Tracks:
 *   main    →  /audio/background-loop.mp3   (home, lobby, leaderboard)
 *   rush    →  /audio/rush.mp3              (Rush mode)
 *   grandma →  /audio/grandma-walk.mp3      (Grandma Walking)
 *   golf    →  /audio/golf.mp3              (Golf mode)
 *   time    →  /audio/time-mode.mp3         (Time mode)
 *
 * Usage:
 *   musicManager.toggle()              — flip on/off (with fade)
 *   musicManager.setTrack('rush')      — cross-fade to rush track
 *   musicManager.setTrack('main')      — cross-fade back to main track
 *   musicManager.enabled               — current on/off state
 *   musicManager.currentTrack          — active TrackKey
 *   musicManager.subscribe(fn)         — listen for enabled changes
 *   musicManager.silence()             — fade out without changing preference
 *   musicManager.unsilence()           — fade back in if music was enabled
 */

export type TrackKey = 'main' | 'rush' | 'grandma' | 'golf' | 'time';

const STORAGE_KEY = 'innerclock_music_on';

/** Audio sources for each track — first match the browser can play wins. */
const TRACKS: Record<TrackKey, string[]> = {
  main:    ['/audio/background-loop.mp3', '/audio/background-loop.ogg'],
  rush:    ['/audio/rush.mp3',            '/audio/background-loop.mp3'],
  grandma: ['/audio/grandma-walk.mp3',   '/audio/grandma%20walk.mp3', '/audio/background-loop.mp3'],
  golf:    ['/audio/golf.mp3',            '/audio/background-loop.mp3'],
  time:    ['/audio/time-mode.mp3',       '/audio/background-loop.mp3'],
};

const DEFAULT_VOLUME = 0.35;
const FADE_STEPS     = 20;
const FADE_INTERVAL  = 18;  // ms per step → ~360 ms total fade

// ── Manager ───────────────────────────────────────────────────────────────────

class BackgroundMusicManager {
  private audio:         HTMLAudioElement | null = null;
  private _enabled:      boolean;
  private _currentTrack: TrackKey = 'main';
  private listeners      = new Set<(enabled: boolean) => void>();

  /**
   * Single active fade interval — cleared before any new fade starts.
   * Prevents two fades fighting over audio.volume simultaneously.
   */
  private _fadeId: ReturnType<typeof setInterval> | null = null;

  /**
   * Generation counter — incremented on every setTrack() call.
   * A fade-out callback checks this before starting a fade-in so that
   * stale callbacks from superseded track switches are silently dropped.
   */
  private _fadeGen = 0;

  constructor() {
    this._enabled = localStorage.getItem(STORAGE_KEY) !== 'false';
    this._init();
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  private _init() {
    try {
      const el      = document.createElement('audio');
      el.loop       = true;
      el.volume     = DEFAULT_VOLUME;
      el.preload    = 'none';
      this.audio    = el;

      // Load initial (main) track sources
      this._applySources(TRACKS['main']);

      // Silently swallow load errors — app must not crash when files are absent
      el.addEventListener('error', () => {
        if (import.meta.env.DEV) {
          console.warn(
            `[InnerClock] ⚠  Music file not found for track "${this._currentTrack}".\n` +
            '  Place royalty-free loops at:\n' +
            '    public/audio/background-loop.mp3  (main track)\n' +
            '    public/audio/rush.mp3               (rush track)\n' +
            '  If rush.mp3 is absent, the main track will be used instead.',
          );
        }
      });

      if (this._enabled) {
        // Attempt immediate play — will be silently blocked until a user gesture
        el.play().catch(() => {});

        // Resume on the very first pointer interaction if autoplay was blocked
        document.addEventListener(
          'pointerdown',
          () => { if (this._enabled && this.audio?.paused) this._fadeIn(); },
          { once: true },
        );
      }
    } catch {
      // Audio API unavailable (e.g., restricted sandboxed iframe)
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  get enabled():      boolean  { return this._enabled; }
  get currentTrack(): TrackKey { return this._currentTrack; }

  /** Toggle music on / off with a smooth fade. */
  toggle(): void {
    this._enabled = !this._enabled;
    localStorage.setItem(STORAGE_KEY, String(this._enabled));
    if (this._enabled) this._fadeIn();
    else               this._fadeOut();
    this._notify();
  }

  /**
   * Switch to a different track.
   *
   * If music is ON: cancel any running fade, then fade out → swap sources →
   * fade in.  A generation counter ensures that if setTrack() is called again
   * before the fade-out finishes, the stale callback is dropped — preventing
   * two tracks from playing simultaneously.
   *
   * If music is OFF: swap sources silently so the next play() uses the new track.
   * No-op if the requested track is already active.
   */
  setTrack(key: TrackKey): void {
    if (this._currentTrack === key) return;
    this._currentTrack = key;

    if (!this.audio) return;

    if (!this._enabled) {
      // Music is off — update sources so the correct track is ready when turned on
      this._applySources(TRACKS[key]);
      this.audio.load();
      return;
    }

    // Bump generation so any in-flight fade-out callback is invalidated
    const gen = ++this._fadeGen;

    this._fadeOutThen(() => {
      // Guard: a newer setTrack() was called while we were fading out
      if (gen !== this._fadeGen) return;
      if (!this.audio) return;
      this._applySources(TRACKS[key]);
      this.audio.load();
      this._fadeIn();
    });
  }

  /**
   * Temporarily fade out music without changing the on/off preference.
   * Call unsilence() to restore when the silent context is over.
   */
  silence(): void {
    this._fadeOutThen(() => {}); // fade out; leave currentTime intact for resume
  }

  /**
   * Restore music after silence() — resumes only if music was enabled.
   */
  unsilence(): void {
    if (this._enabled) this._fadeIn();
  }

  /**
   * Subscribe to enabled/disabled changes.
   * Returns an unsubscribe function.
   */
  subscribe(cb: (enabled: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Cancel any running fade interval. Must be called before starting a new one. */
  private _clearFade(): void {
    if (this._fadeId !== null) {
      clearInterval(this._fadeId);
      this._fadeId = null;
    }
  }

  private _applySources(sources: string[]): void {
    if (!this.audio) return;
    // Replace all <source> children
    while (this.audio.firstChild) {
      this.audio.removeChild(this.audio.firstChild);
    }
    sources.forEach(src => {
      const s  = document.createElement('source');
      s.src    = src;
      this.audio!.appendChild(s);
    });
  }

  private _fadeIn(): void {
    this._clearFade();          // cancel any running fade before starting
    if (!this.audio) return;
    this.audio.volume = 0;
    this.audio.play().catch(() => {});
    let step = 0;
    this._fadeId = setInterval(() => {
      if (!this.audio) { this._clearFade(); return; }
      step++;
      this.audio.volume = Math.min(DEFAULT_VOLUME, (step / FADE_STEPS) * DEFAULT_VOLUME);
      if (step >= FADE_STEPS) this._clearFade();
    }, FADE_INTERVAL);
  }

  /** Fade out and pause, resetting playback position. */
  private _fadeOut(): void {
    this._fadeOutThen(() => {
      if (this.audio) this.audio.currentTime = 0;
    });
  }

  /**
   * Cancel any in-flight fade, then fade out and call `callback` once silent.
   * If audio is already paused, calls `callback` synchronously.
   */
  private _fadeOutThen(callback: () => void): void {
    this._clearFade();          // cancel any running fade before starting
    if (!this.audio) { callback(); return; }
    if (this.audio.paused) { callback(); return; }

    const startVol = this.audio.volume;
    let step = 0;
    this._fadeId = setInterval(() => {
      if (!this.audio) { this._clearFade(); callback(); return; }
      step++;
      this.audio.volume = Math.max(0, startVol * (1 - step / FADE_STEPS));
      if (step >= FADE_STEPS) {
        this._clearFade();
        this.audio.pause();
        callback();
      }
    }, FADE_INTERVAL);
  }

  private _notify(): void {
    this.listeners.forEach(cb => cb(this._enabled));
  }
}

// One shared instance for the entire app lifetime
export const musicManager = new BackgroundMusicManager();
