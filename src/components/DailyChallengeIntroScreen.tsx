import { formatLocalDate } from '../lib/dailyChallenge';
import { MODE_LABELS_FULL, MODE_ICONS } from '../lib/roomRounds';

interface Props {
  games:      string[];   // 5 game mode keys in order
  playerName: string;
  onStart:    () => void;
  onBack:     () => void;
}

export default function DailyChallengeIntroScreen({ games, playerName, onStart, onBack }: Props) {
  const dateLabel = formatLocalDate();

  return (
    <div className="screen dc-intro-screen">

      {/* Header */}
      <div className="dc-intro-header">
        <button className="btn-ghost dc-intro-back" onClick={onBack} aria-label="Back">
          ← Home
        </button>
        <span className="dc-intro-badge">DAILY</span>
      </div>

      {/* Hero */}
      <div className="dc-intro-hero">
        <div className="dc-intro-icon" aria-hidden="true">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="24" stroke="rgba(255,200,50,0.55)" strokeWidth="2"/>
            <circle cx="26" cy="26" r="16" stroke="rgba(255,200,50,0.35)" strokeWidth="1.5"/>
            <circle cx="26" cy="26" r="8"  fill="rgba(255,200,50,0.22)"/>
            {/* Rays */}
            {[0,45,90,135,180,225,270,315].map(deg => {
              const a = deg * Math.PI / 180;
              return (
                <line
                  key={deg}
                  x1={26 + Math.cos(a) * 20}
                  y1={26 + Math.sin(a) * 20}
                  x2={26 + Math.cos(a) * 24}
                  y2={26 + Math.sin(a) * 24}
                  stroke="rgba(255,200,50,0.70)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              );
            })}
            <circle cx="26" cy="26" r="3.5" fill="rgba(255,200,50,0.95)"/>
          </svg>
        </div>

        <h1 className="dc-intro-title">Daily Challenge</h1>
        <p className="dc-intro-date">{dateLabel}</p>
        <p className="dc-intro-tagline">Five games. One daily score.</p>
      </div>

      {/* Game list */}
      <div className="dc-intro-games">
        {games.map((mode, i) => (
          <div key={mode} className="dc-intro-game-row">
            <span className="dc-intro-game-num">{i + 1}</span>
            <span className="dc-intro-game-icon" aria-hidden="true">
              {MODE_ICONS[mode] ?? '▷'}
            </span>
            <span className="dc-intro-game-name">
              {MODE_LABELS_FULL[mode] ?? mode}
            </span>
          </div>
        ))}
      </div>

      {/* Info note */}
      <p className="dc-intro-note">
        Play all 5 back-to-back · Scores combine into one daily total
      </p>

      {/* CTA */}
      <button className="dc-start-btn" onClick={onStart}>
        {playerName ? `Start — ${playerName}` : 'Start Daily Challenge'}
      </button>

    </div>
  );
}
