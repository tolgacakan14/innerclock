import { useState, useRef, useEffect } from 'react';

interface Props {
  onConfirm: (name: string) => void;
}

const STORAGE_KEY = 'kroneName';

export default function NameScreen({ onConfirm }: Props) {
  // Pre-fill from localStorage — user must still confirm
  const [name, setName] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? '',
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input on mount
  useEffect(() => {
    // Small delay so the screen-enter animation doesn't fight the keyboard
    const t = setTimeout(() => inputRef.current?.focus(), 240);
    return () => clearTimeout(t);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(STORAGE_KEY, trimmed);
    onConfirm(trimmed);
  }

  const trimmed = name.trim();

  return (
    <div className="screen name-screen">
      {/* Brand mark — static logo, no float animation on entry screen */}
      <div className="name-brand">
        <div className="home-logo-mark" aria-hidden="true">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
            <line x1="24" y1="24" x2="24" y2="8"  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="24" y1="24" x2="34" y2="30" stroke="currentColor" strokeWidth="2"   strokeLinecap="round" />
            <circle cx="24" cy="24" r="2.5" fill="currentColor" />
          </svg>
        </div>
        <h1 className="home-logo name-screen-logo">Krone</h1>
        <p className="home-tagline">Train your perception.</p>
      </div>

      {/* Name form */}
      <form className="name-form" onSubmit={handleSubmit} noValidate>
        <label className="name-label" htmlFor="player-name">
          What's your name?
        </label>
        <input
          ref={inputRef}
          id="player-name"
          className="name-input"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          maxLength={24}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!trimmed}
        >
          Continue →
        </button>
        {trimmed && (
          <p className="name-hint">
            Saved locally — you can change it anytime.
          </p>
        )}
      </form>
    </div>
  );
}
