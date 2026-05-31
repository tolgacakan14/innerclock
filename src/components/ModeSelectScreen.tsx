import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

type GameMode = 'time' | 'color' | 'rush' | 'golf' | 'grandma' | 'arrowEscape' | 'sequence' | 'memory' | 'timing';

interface Props {
  playerName:    string;
  onSelect:      (mode: GameMode) => void;
  onChangeName:  () => void;
  onCreateRoom?: () => void;
  onJoinRoom?:   () => void;
}

// ── Card SVG graphics ─────────────────────────────────────────────────────────

function TimeGraphic() {
  const majorTicks = [0, 60, 120, 180, 240, 300];
  const minorTicks = [30, 90, 150, 210, 270, 330];
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className="home-card-svg">
      <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
      <circle cx="50" cy="50" r="26" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
      {majorTicks.map(d => {
        const a = (d - 90) * Math.PI / 180;
        return (
          <line key={d}
            x1={50 + Math.cos(a) * 33} y1={50 + Math.sin(a) * 33}
            x2={50 + Math.cos(a) * 38} y2={50 + Math.sin(a) * 38}
            stroke="rgba(255,255,255,0.45)" strokeWidth="2"/>
        );
      })}
      {minorTicks.map(d => {
        const a = (d - 90) * Math.PI / 180;
        return (
          <line key={d}
            x1={50 + Math.cos(a) * 35.5} y1={50 + Math.sin(a) * 35.5}
            x2={50 + Math.cos(a) * 38}   y2={50 + Math.sin(a) * 38}
            stroke="rgba(255,255,255,0.20)" strokeWidth="1"/>
        );
      })}
      {/* 10:10 hands */}
      <line x1="50" y1="50" x2="37" y2="28" stroke="rgba(255,255,255,0.92)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="50" y1="50" x2="63" y2="28" stroke="rgba(255,255,255,0.68)" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="50" cy="50" r="3.5" fill="rgba(255,255,255,0.92)"/>
    </svg>
  );
}

function ColorGraphic() {
  const colors = [
    '#FF453A', '#FF9F0A', '#FFD60A', '#30D158',
    '#5AC8F5', '#0A84FF', '#BF5AF2', '#FF375F',
  ];
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className="home-card-svg">
      {colors.map((c, i) => {
        const a = (i / colors.length) * Math.PI * 2 - Math.PI / 2;
        return (
          <circle key={i}
            cx={50 + Math.cos(a) * 30} cy={50 + Math.sin(a) * 30}
            r={9.5} fill={c} opacity={0.82}/>
        );
      })}
      <circle cx="50" cy="50" r="11" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"/>
      <circle cx="50" cy="50" r="3.5" fill="rgba(255,255,255,0.92)"/>
    </svg>
  );
}

function RushGraphic() {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className="home-card-svg">
      <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
      <circle cx="50" cy="50" r="28" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5"/>
      <circle cx="50" cy="50" r="17" stroke="rgba(255,255,255,0.22)" strokeWidth="2"/>
      <circle cx="50" cy="50" r="8"  fill="rgba(255,69,58,0.80)"/>
      <circle cx="50" cy="50" r="3"  fill="rgba(255,255,255,0.95)"/>
      {/* Crosshair */}
      <line x1="50" y1="6"  x2="50" y2="22" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5"/>
      <line x1="50" y1="78" x2="50" y2="94" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5"/>
      <line x1="6"  y1="50" x2="22" y2="50" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5"/>
      <line x1="78" y1="50" x2="94" y2="50" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5"/>
    </svg>
  );
}

function GolfGraphic() {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className="home-card-svg">
      {/* Outer dark background */}
      <rect x="0" y="0" width="100" height="100" fill="#14151A"/>
      {/* Course shadow */}
      <rect x="11" y="11" width="80" height="80" fill="rgba(0,0,0,0.50)" rx="8"/>
      {/* Green course surface */}
      <rect x="8" y="8" width="80" height="80" fill="#1A5228" rx="7"/>
      {/* White border */}
      <rect x="8" y="8" width="80" height="80" fill="none"
        stroke="rgba(255,255,255,0.90)" strokeWidth="4.5" rx="7"/>
      {/* Wall obstacle */}
      <line x1="40" y1="20" x2="40" y2="58"
        stroke="rgba(255,255,255,0.88)" strokeWidth="6" strokeLinecap="round"/>
      {/* Arc trajectory */}
      <path d="M 22 78 Q 44 30 78 52"
        stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" strokeDasharray="5 4"/>
      {/* Ball */}
      <circle cx="22" cy="78" r="7" fill="rgba(255,255,255,0.95)"/>
      <text x="22" y="80.5" textAnchor="middle" fontSize="3.2" fontWeight="700"
        fill="rgba(20,20,40,0.68)" letterSpacing="0.25">KRONE</text>
      {/* Hole */}
      <circle cx="78" cy="52" r="5.5" fill="rgba(4,8,4,0.95)"
        stroke="rgba(255,255,255,0.55)" strokeWidth="1.2"/>
      {/* Flag pole */}
      <line x1="78" y1="46" x2="78" y2="28"
        stroke="rgba(255,255,255,0.72)" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Flag */}
      <path d="M78 28 L90 33 L78 38 Z" fill="rgba(48,209,88,0.92)"/>
    </svg>
  );
}

function GrandmaGraphic() {
  return (
    <svg viewBox="0 0 180 82" fill="none" aria-hidden="true" className="home-card-svg">
      {/* Sky */}
      <rect x="0" y="0" width="180" height="64" fill="#06050F"/>
      {/* Tiny stars */}
      <circle cx="20"  cy="12" r="0.8" fill="rgba(255,255,255,0.45)"/>
      <circle cx="55"  cy="8"  r="0.8" fill="rgba(255,255,255,0.35)"/>
      <circle cx="90"  cy="18" r="0.8" fill="rgba(255,255,255,0.40)"/>
      <circle cx="130" cy="10" r="0.8" fill="rgba(255,255,255,0.38)"/>
      <circle cx="165" cy="15" r="0.8" fill="rgba(255,255,255,0.30)"/>
      {/* Ground */}
      <rect x="0" y="62" width="180" height="20" fill="rgba(55,48,75,0.96)"/>
      <line x1="0" y1="62" x2="180" y2="62" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"/>

      {/* ── Chaser silhouette ── */}
      {/* Legs */}
      <line x1="16" y1="52" x2="11" y2="62" stroke="rgba(215,185,155,0.85)" strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="20" y1="52" x2="25" y2="62" stroke="rgba(215,185,155,0.85)" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Pink briefs */}
      <path d="M11 46 L27 46 L24 54 L14 54 Z" fill="rgba(255,110,145,0.90)"/>
      <rect x="10" y="44" width="18" height="3.5" fill="rgba(255,140,165,0.88)" rx="1"/>
      {/* Torso (wide V shape) */}
      <path d="M11 46 L27 46 L30 28 L8 28 Z" fill="rgba(225,192,158,0.90)"/>
      {/* Pec lines */}
      <line x1="14" y1="36" x2="19" y2="34" stroke="rgba(195,162,128,0.45)" strokeWidth="0.8"/>
      <line x1="24" y1="36" x2="19" y2="34" stroke="rgba(195,162,128,0.45)" strokeWidth="0.8"/>
      {/* Arms pumping */}
      <line x1="30" y1="30" x2="38" y2="40" stroke="rgba(225,192,158,0.85)" strokeWidth="4" strokeLinecap="round"/>
      <line x1="8"  y1="30" x2="1"  y2="42" stroke="rgba(225,192,158,0.75)" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Head */}
      <circle cx="19" cy="20" r="8" fill="rgba(228,196,162,0.94)"/>
      {/* Pompadour */}
      <path d="M12 18 Q14 6 19 4 Q24 2 26 14 Q22 16 19 17 Z" fill="rgba(255,215,55,0.96)"/>
      <path d="M13 18 Q14 8 19 6 Q18 12 18 17 Z" fill="rgba(255,240,120,0.50)"/>
      {/* Sunglasses */}
      <rect x="11" y="19" width="7" height="4" rx="1" fill="rgba(15,12,22,0.95)"/>
      <rect x="20" y="19" width="7" height="4" rx="1" fill="rgba(15,12,22,0.95)"/>
      <rect x="18" y="20" width="2" height="2" fill="rgba(35,30,48,0.88)"/>

      {/* ── Grandma ── */}
      {/* Dress */}
      <path d="M72 62 L86 62 L83 44 L75 44 Z" fill="rgba(200,185,215,0.92)"/>
      {/* Upper body */}
      <rect x="75" y="36" width="11" height="10" rx="3" fill="rgba(232,222,238,0.92)"/>
      {/* Arm with cane */}
      <line x1="85" y1="40" x2="90" y2="50" stroke="rgba(210,178,148,0.85)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="90" y1="48" x2="96" y2="62" stroke="rgba(168,150,125,0.82)" strokeWidth="2" strokeLinecap="round"/>
      {/* Head */}
      <circle cx="80" cy="28" r="7.5" fill="rgba(215,180,150,0.94)"/>
      {/* Cheek */}
      <circle cx="84" cy="30" r="2.5" fill="rgba(240,160,140,0.25)"/>
      {/* Hair bun */}
      <circle cx="81" cy="21" r="5" fill="rgba(210,208,215,0.96)"/>
      <circle cx="81" cy="21" r="2.8" fill="rgba(185,182,192,0.55)"/>
      {/* Glasses */}
      <ellipse cx="77" cy="29" rx="2.5" ry="1.8" stroke="rgba(60,55,75,0.72)" strokeWidth="0.8" fill="none"/>
      <ellipse cx="83" cy="29" rx="2.5" ry="1.8" stroke="rgba(60,55,75,0.72)" strokeWidth="0.8" fill="none"/>
      <line x1="79.5" y1="29" x2="80.5" y2="29" stroke="rgba(60,55,75,0.72)" strokeWidth="0.8"/>

      {/* Low crate obstacle ahead */}
      <rect x="118" y="44" width="14" height="18" rx="2" fill="rgba(232,224,248,0.72)"/>
      <line x1="119" y1="45" x2="131" y2="61" stroke="rgba(180,170,210,0.30)" strokeWidth="0.8"/>
      <line x1="131" y1="45" x2="119" y2="61" stroke="rgba(180,170,210,0.30)" strokeWidth="0.8"/>
      <rect x="120" y="46" width="10" height="5" fill="rgba(255,255,255,0.18)" rx="1"/>

      {/* High hanging obstacle */}
      <rect x="150" y="28" width="13" height="22" rx="2" fill="rgba(210,200,230,0.72)"/>
      <line x1="156" y1="0" x2="156" y2="28" stroke="rgba(185,175,210,0.25)" strokeWidth="2.5"/>
      <rect x="151" y="29" width="9" height="6" fill="rgba(255,255,255,0.18)" rx="1"/>
      {/* Warning stripe */}
      <rect x="150" y="44" width="13" height="6" fill="rgba(255,200,60,0.38)" rx="1"/>

      {/* Speed trail lines behind chaser */}
      <line x1="0"  y1="38" x2="6"  y2="38" stroke="rgba(255,100,50,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="0"  y1="44" x2="4"  y2="44" stroke="rgba(255,100,50,0.25)" strokeWidth="1"   strokeLinecap="round"/>
      <line x1="0"  y1="50" x2="5"  y2="50" stroke="rgba(255,100,50,0.20)" strokeWidth="1"   strokeLinecap="round"/>
    </svg>
  );
}

function SequenceGraphic() {
  // 3×2 grid — first 3 tiles are "lit" in the sequence, last 3 are dim
  const COLORS = ['#FF453A','#FF9F0A','#30D158','#5AC8F5','#BF5AF2','#FFD60A'];
  const LIT    = [0, 2, 4];  // tiles currently in the sequence (shown as step 1-2-3)
  const litOrder = [1, 2, 3];

  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className="home-card-svg">
      {/* Dark field with radial glow */}
      <rect x="0" y="0" width="100" height="100" fill="#08071A"/>
      <radialGradient id="seqGlow" cx="50%" cy="48%" r="52%">
        <stop offset="0%" stopColor="rgba(255,159,10,0.14)"/>
        <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
      </radialGradient>
      <rect x="0" y="0" width="100" height="100" fill="url(#seqGlow)"/>

      {/* 3×2 tiles */}
      {[0,1,2].map(col => [0,1].map(row => {
        const i   = row * 3 + col;
        const x   = 9 + col * 28;
        const y   = 18 + row * 30;
        const lit = LIT.includes(i);
        const seq = lit ? litOrder[LIT.indexOf(i)] : null;
        const c   = COLORS[i];

        return (
          <g key={i}>
            {/* Glow halo for lit tiles */}
            {lit && (
              <rect x={x-3} y={y-3} width={28} height={28} rx="9"
                fill={c} opacity="0.18"/>
            )}
            {/* Tile body */}
            <rect x={x} y={y} width={22} height={22} rx="6"
              fill={lit ? c : 'rgba(255,255,255,0.055)'}
              stroke={lit ? c : 'rgba(255,255,255,0.10)'}
              strokeWidth={lit ? 0 : 1}
              opacity={lit ? 0.90 : 1}
            />
            {/* Inner shine on lit tile */}
            {lit && (
              <rect x={x+2} y={y+2} width={18} height={7} rx="3"
                fill="rgba(255,255,255,0.22)"/>
            )}
            {/* Sequence number */}
            {seq !== null && (
              <text x={x+11} y={y+15.5} textAnchor="middle"
                fill="rgba(255,255,255,0.95)" fontSize="10" fontWeight="800"
                fontFamily="system-ui,-apple-system,sans-serif">
                {seq}
              </text>
            )}
          </g>
        );
      }))}

      {/* Connecting dashes between step 1→2→3 */}
      <line x1="31" y1="29" x2="38" y2="44" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeDasharray="2.5 2"/>
      <line x1="53" y1="44" x2="66" y2="29" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeDasharray="2.5 2"/>

      {/* "…" hint */}
      <text x="50" y="86" textAnchor="middle"
        fill="rgba(255,159,10,0.65)" fontSize="7.5" fontWeight="700"
        fontFamily="system-ui,-apple-system,sans-serif"
        letterSpacing="3">
        · · ·
      </text>
      <text x="50" y="96" textAnchor="middle"
        fill="rgba(255,255,255,0.28)" fontSize="6.5"
        fontFamily="system-ui,-apple-system,sans-serif">
        Watch · Repeat
      </text>
    </svg>
  );
}

function MemoryGridGraphic() {
  // 4×4 grid — 5 cells are "lit" (the ones to memorise)
  const LIT = new Set([1, 5, 6, 10, 14]);

  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className="home-card-svg">
      {/* Background with blue tint */}
      <rect x="0" y="0" width="100" height="100" fill="#060D1C"/>
      <radialGradient id="memGlow" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stopColor="rgba(90,200,245,0.12)"/>
        <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
      </radialGradient>
      <rect x="0" y="0" width="100" height="100" fill="url(#memGlow)"/>

      {/* 4×4 grid */}
      {Array.from({length: 16}, (_, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const lit = LIT.has(i);
        const x   = 8 + col * 22;
        const y   = 10 + row * 22;
        return (
          <g key={i}>
            {lit && (
              <rect x={x-2} y={y-2} width={22} height={22} rx="6"
                fill="rgba(90,200,245,0.18)"/>
            )}
            <rect x={x} y={y} width={18} height={18} rx="4"
              fill={lit ? 'rgba(90,200,245,0.78)' : 'rgba(255,255,255,0.055)'}
              stroke={lit ? 'rgba(90,200,245,0.90)' : 'rgba(255,255,255,0.09)'}
              strokeWidth="1"
            />
            {lit && (
              <rect x={x+1} y={y+1} width={16} height={6} rx="2"
                fill="rgba(255,255,255,0.24)"/>
            )}
          </g>
        );
      })}

      {/* Flash overlay effect on lit cells */}
      <rect x="0" y="0" width="100" height="100" fill="rgba(90,200,245,0.03)"/>

      {/* Bottom label */}
      <text x="50" y="96" textAnchor="middle"
        fill="rgba(90,200,245,0.55)" fontSize="6.5" fontWeight="600"
        fontFamily="system-ui,-apple-system,sans-serif"
        letterSpacing="0.5">
        REMEMBER · RECALL
      </text>
    </svg>
  );
}

function TapTimingGraphic() {
  // Marker sitting just inside the perfect zone, about to reach center
  const markerX = 54;

  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className="home-card-svg">
      {/* Background with green glow */}
      <rect x="0" y="0" width="100" height="100" fill="#050D0A"/>
      <radialGradient id="ttGlow" cx="50%" cy="52%" r="40%">
        <stop offset="0%" stopColor="rgba(48,209,88,0.14)"/>
        <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
      </radialGradient>
      <rect x="0" y="0" width="100" height="100" fill="url(#ttGlow)"/>

      {/* ── Score / combo hint at top ── */}
      <text x="50" y="22" textAnchor="middle"
        fill="rgba(255,214,10,0.80)" fontSize="11" fontWeight="800"
        fontFamily="system-ui,-apple-system,sans-serif"
        letterSpacing="-0.5">
        x3 COMBO
      </text>
      <text x="50" y="33" textAnchor="middle"
        fill="rgba(48,209,88,0.70)" fontSize="7.5" fontWeight="700"
        fontFamily="system-ui,-apple-system,sans-serif">
        +30 pts
      </text>

      {/* ── Timing bar ── */}
      {/* Bar background */}
      <rect x="6" y="44" width="88" height="16" rx="8" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8"/>
      {/* Good zone (amber) */}
      <rect x="18" y="44" width="64" height="16" rx="7" fill="rgba(255,159,10,0.20)"/>
      {/* Perfect zone (green) */}
      <rect x="35" y="44" width="30" height="16" rx="6" fill="rgba(48,209,88,0.35)"/>
      {/* Perfect zone inner glow */}
      <rect x="36" y="45" width="28" height={6} rx="3" fill="rgba(48,209,88,0.22)"/>

      {/* Center guide line */}
      <line x1="50" y1="40" x2="50" y2="64"
        stroke="rgba(48,209,88,0.60)" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Marker shadow */}
      <ellipse cx={markerX} cy="66" rx="6" ry="2.5" fill="rgba(0,0,0,0.35)"/>
      {/* Marker body */}
      <circle cx={markerX} cy="52" r="7.5"
        fill="white"
        style={{ filter: 'drop-shadow(0 0 5px rgba(48,209,88,0.70))' }}
      />
      {/* Marker inner ring */}
      <circle cx={markerX} cy="52" r="4" fill="rgba(48,209,88,0.80)"/>

      {/* Zone labels */}
      <text x="28" y="74" textAnchor="middle"
        fill="rgba(255,159,10,0.65)" fontSize="5.5" fontWeight="600"
        fontFamily="system-ui,-apple-system,sans-serif" letterSpacing="0.3">
        GOOD
      </text>
      <text x="50" y="74" textAnchor="middle"
        fill="rgba(48,209,88,0.80)" fontSize="5.5" fontWeight="700"
        fontFamily="system-ui,-apple-system,sans-serif" letterSpacing="0.3">
        PERFECT
      </text>
      <text x="72" y="74" textAnchor="middle"
        fill="rgba(255,159,10,0.65)" fontSize="5.5" fontWeight="600"
        fontFamily="system-ui,-apple-system,sans-serif" letterSpacing="0.3">
        GOOD
      </text>

      {/* Tap cue */}
      <text x="50" y="92" textAnchor="middle"
        fill="rgba(255,255,255,0.30)" fontSize="6.5"
        fontFamily="system-ui,-apple-system,sans-serif">
        Tap at the perfect moment
      </text>
    </svg>
  );
}

function ArrowEscapeGraphic() {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className="home-card-svg">
      <rect x="0" y="0" width="100" height="100" fill="#060C1E"/>
      {/* 4×4 grid lines */}
      {[28,46,64,82].map(v => (
        <g key={v}>
          <line x1={v} y1="14" x2={v} y2="86" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8"/>
          <line x1="14" y1={v} x2="86" y2={v} stroke="rgba(255,255,255,0.07)" strokeWidth="0.8"/>
        </g>
      ))}
      {/* Arrow tiles */}
      <rect x="15" y="47" width="17" height="17" rx="3" fill="rgba(0,212,255,0.14)" stroke="rgba(0,212,255,0.65)" strokeWidth="1"/>
      <path d="M21 55.5 L28 55.5 M25.5 52.5 L28 55.5 L25.5 58.5" stroke="#00D4FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

      <rect x="47" y="15" width="17" height="17" rx="3" fill="rgba(48,209,88,0.14)" stroke="rgba(48,209,88,0.65)" strokeWidth="1"/>
      <path d="M55.5 21 L55.5 28 M52.5 25.5 L55.5 28 L58.5 25.5" stroke="#30D158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

      <rect x="65" y="47" width="17" height="17" rx="3" fill="rgba(255,214,10,0.14)" stroke="rgba(255,214,10,0.65)" strokeWidth="1"/>
      <path d="M71 55.5 L78 55.5 M75.5 52.5 L78 55.5 L75.5 58.5" stroke="#FFD60A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

      <rect x="33" y="65" width="17" height="17" rx="3" fill="rgba(255,55,95,0.14)" stroke="rgba(255,55,95,0.65)" strokeWidth="1"/>
      <path d="M41.5 71 L41.5 78 M38.5 75.5 L41.5 78 L44.5 75.5" stroke="#FF375F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Escape trail — cyan arrow sliding right */}
      <line x1="83" y1="55.5" x2="96" y2="55.5" stroke="rgba(0,212,255,0.55)" strokeWidth="1.5" strokeDasharray="3 2"/>
      <path d="M94 52.5 L98 55.5 L94 58.5" fill="rgba(0,212,255,0.80)"/>

      {/* +10 score pop */}
      <text x="87" y="48" fill="#30D158" fontSize="7.5" fontWeight="800" opacity="0.90">+10</text>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ModeSelectScreen({ playerName, onSelect, onChangeName, onCreateRoom, onJoinRoom }: Props) {
  const { enabled, toggle } = useBackgroundMusic();

  return (
    <div className="screen home-screen">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="home-topbar">
        <div className="home-brand-row">
          <svg
            width="22" height="22" viewBox="0 0 48 48" fill="none"
            aria-hidden="true" style={{ color: 'rgba(255,255,255,0.72)' }}
          >
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5"/>
            <line x1="24" y1="24" x2="24" y2="8"  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="24" y1="24" x2="34" y2="30" stroke="currentColor" strokeWidth="2"   strokeLinecap="round"/>
            <circle cx="24" cy="24" r="2.5" fill="currentColor"/>
          </svg>
          <span className="home-logo-text">Krone</span>
        </div>
        <button
          className={`music-toggle${enabled ? ' music-toggle--on' : ''}`}
          onClick={toggle}
          aria-label={enabled ? 'Turn music off' : 'Turn music on'}
        >
          <span className="music-toggle-icon" aria-hidden="true">♪</span>
          {enabled ? 'On' : 'Off'}
        </button>
      </div>

      {/* ── Player row ──────────────────────────────────────────── */}
      <div className="home-player">
        <span className="home-player-greeting">
          {playerName ? `Hi, ${playerName}` : 'Welcome'}
        </span>
        <button className="home-player-change" onClick={onChangeName}>
          Change name
        </button>
      </div>

      {/* ── Card grid ───────────────────────────────────────────── */}
      <div className="home-cards">

        <button className="home-card home-card--time" onClick={() => onSelect('time')}>
          <div className="home-card-graphic"><TimeGraphic/></div>
          <div className="home-card-foot">
            <p className="home-card-title">Time Mode</p>
            <p className="home-card-desc">Feel the duration</p>
          </div>
        </button>

        <button className="home-card home-card--color" onClick={() => onSelect('color')}>
          <div className="home-card-graphic"><ColorGraphic/></div>
          <div className="home-card-foot">
            <p className="home-card-title">Colour Mode</p>
            <p className="home-card-desc">Match the hue</p>
          </div>
        </button>

        <button className="home-card home-card--rush" onClick={() => onSelect('rush')}>
          <div className="home-card-graphic"><RushGraphic/></div>
          <div className="home-card-foot">
            <p className="home-card-title">Rush Mode</p>
            <p className="home-card-desc">Hit every target</p>
          </div>
        </button>

        <button className="home-card home-card--golf" onClick={() => onSelect('golf')}>
          <div className="home-card-graphic"><GolfGraphic/></div>
          <div className="home-card-foot">
            <p className="home-card-title">Golf Mode</p>
            <p className="home-card-desc">Fewest shots wins</p>
          </div>
        </button>

        <button className="home-card home-card--grandma" onClick={() => onSelect('grandma')}>
          <div className="home-card-graphic"><GrandmaGraphic/></div>
          <div className="home-card-foot">
            <p className="home-card-title">Grandma Walking</p>
            <p className="home-card-desc">Jump, crouch, survive</p>
          </div>
        </button>

        <button className="home-card home-card--arrowescape" onClick={() => onSelect('arrowEscape')}>
          <div className="home-card-graphic"><ArrowEscapeGraphic/></div>
          <div className="home-card-foot">
            <p className="home-card-title">Arrow Escape</p>
            <p className="home-card-desc">Remove arrows in the right order and clear the board.</p>
          </div>
        </button>

        <button className="home-card home-card--sequence" onClick={() => onSelect('sequence')}>
          <div className="home-card-graphic"><SequenceGraphic/></div>
          <div className="home-card-foot">
            <p className="home-card-title">Sequence Tap</p>
            <p className="home-card-desc">Watch the pattern, repeat it perfectly.</p>
          </div>
        </button>

        <button className="home-card home-card--memory" onClick={() => onSelect('memory')}>
          <div className="home-card-graphic"><MemoryGridGraphic/></div>
          <div className="home-card-foot">
            <p className="home-card-title">Memory Grid</p>
            <p className="home-card-desc">Remember which cells light up.</p>
          </div>
        </button>

        <button className="home-card home-card--timing" onClick={() => onSelect('timing')}>
          <div className="home-card-graphic"><TapTimingGraphic/></div>
          <div className="home-card-foot">
            <p className="home-card-title">Tap Timing</p>
            <p className="home-card-desc">Hit the perfect zone as the marker moves.</p>
          </div>
        </button>

      </div>

      {/* ── Play with Friends ────────────────────────────────────── */}
      {(onCreateRoom || onJoinRoom) && (
        <div className="home-friends-bar">
          <span className="home-friends-label">Play with friends</span>
          <div className="home-friends-actions">
            {onCreateRoom && (
              <button className="home-friends-btn" onClick={onCreateRoom}>
                🏠 Create Room
              </button>
            )}
            {onJoinRoom && (
              <button className="home-friends-btn" onClick={onJoinRoom}>
                🔗 Join Room
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
