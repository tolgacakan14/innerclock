/**
 * InnerClock — Background Music Manager
 *
 * Singleton that owns the single HTMLAudioElement for background music.
 * Supports multiple named tracks and cross-fading between them.
 * Persists the user's on/off preference in localStorage.
 *
 * Tracks:
 *   main  →  /audio/background-loop.mp3   (home, time mode, color mode)
 *   rush  →  /audio/rush-loop.mp3         (rush mode — falls back to main)
 *
 * Usage:
 *   musicManager.toggle()              — flip on/off (with fade)
 *   musicManager.setTrack('rush')      — cross-fade to rush track
 *   musicManager.setTrack('main')      — cross-fade back to main track
 *   musicManager.enabled               — current on/off state
 *   musicManager.currentTrack          — active TrackKey
 *   musicManager.subscribe(fn)         — listen for enabled changes
 */

export type TrackKey = 'main' | 'rush' | 'grandma' | 'golf';

const STORAGE_KEY = 'innerclock_music_on';

/** Audio sources for each track — first match the browser can play wins. */
const TRACKS: Record<TrackKey, string[]> = {
  main:    ['/audio/background-loop.mp3', '/audio/background-loop.ogg'],
  rush:    ['/audio/rush-loop.mp3',       '/audio/background-loop.mp3'],
  grandma: ['/audio/grandma-walk.mp3',   '/audio/grandma%20walk.mp3', '/audio/background-loop.mp3'],
  golf:    ['/audio/golf.mp3',            '/audio/background-loop.mp3'],
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

  constructor() {
    this._enabled = localStorage.getItem(STORAGE_KEY) === 'true';
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
            '    public/audio/rush-loop.mp3         (rush track)\n' +
            '  If rush-loop.mp3 is absent, the main track will be used instead.',
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
   * If music is ON: fade out → swap sources → fade in (cross-fade ~360 ms each).
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

    // Cross-fade: fade out → load new sources → fade in
    this._fadeOutThen(() => {
      if (!this.audio) return;
      this._applySources(TRACKS[key]);
      this.audio.load();
      this._fadeIn();
    });
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
    if (!this.audio) return;
    this.audio.volume = 0;
    this.audio.play().catch(() => {});
    let step = 0;
    const id = setInterval(() => {
      if (!this.audio) { clearInterval(id); return; }
      step++;
      this.audio.volume = Math.min(DEFAULT_VOLUME, (step / FADE_STEPS) * DEFAULT_VOLUME);
      if (step >= FADE_STEPS) clearInterval(id);
    }, FADE_INTERVAL);
  }

  /** Fade out and pause, resetting playback position. */
  private _fadeOut(): void {
    this._fadeOutThen(() => {
      if (this.audio) this.audio.currentTime = 0;
    });
  }

  /**
   * Fade out then run `callback` when the audio is fully silent.
   * Used internally for both toggle-off and track switching.
   */
  private _fadeOutThen(callback: () => void): void {
    if (!this.audio) { callback(); return; }
    if (this.audio.paused) { callback(); return; }

    const startVol = this.audio.volume;
    let step = 0;
    const id = setInterval(() => {
      if (!this.audio) { clearInterval(id); callback(); return; }
      step++;
      this.audio.volume = Math.max(0, startVol * (1 - step / FADE_STEPS));
      if (step >= FADE_STEPS) {
        clearInterval(id);
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
