import { useEffect, useRef, useState } from 'react';
import { useCompilationStore } from '@/stores/compilationStore';
import type { Phase } from '@/lib/types';

// ── Build ASCII crab frame ──────────────────────────────────────────
function buildCrabFrame(options: { offset?: number; eyes?: string; legs?: string } = {}) {
  const { offset = 0, eyes = 'neutral', legs = 'right' } = options;
  const topPad  = ' '.repeat(4 + Math.max(0, offset));
  const bodyPad = ' '.repeat(2 + Math.max(0, offset));
  const legPad  = ' '.repeat(5 + Math.max(0, offset));

  const eyeMap: Record<string, string> = {
    neutral: '\u258C\u2590\u2588\u2588\u258C\u2590',
    blink:   '\u2580\u2580\u2588\u2588\u2580\u2580',
    happy:   '\u259D\u2598\u2588\u2588\u259D\u2598',
    curious: '\u258C\u258C\u2588\u2588\u2590\u2590',
    angry:   '\u2590\u258C\u2588\u2588\u2590\u258C',
    tired:   '\u2594\u2594\u2588\u2588\u2594\u2594',
    down:    '\u2584\u2584\u2588\u2588\u2584\u2584',
  };
  const legMap: Record<string, string> = {
    right:      '\u2590\u2590  \u258C\u258C',
    left:       '\u258C\u258C  \u2590\u2590',
    wide:       '\u2590\u2590    \u258C\u258C',
    tucked:     ' \u2590\u2590\u258C\u258C',
    'type-r':   '\u258C\u258C  \u2590\u2588',
    'type-l':   '\u2588\u2590  \u258C\u258C',
    'type-both':'\u2588\u2590  \u2590\u2588',
  };
  const eyePattern = eyeMap[eyes] ?? eyeMap.neutral;
  const legPattern = legMap[legs] ?? legMap.right;
  return [
    `${topPad}\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588`,
    `${topPad}\u2588${eyePattern}\u2588`,
    `${bodyPad}\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588`,
    `${topPad}\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588`,
    `${legPad}${legPattern}`,
  ].join('\n');
}

// ── Mood states ─────────────────────────────────────────────────────
type MoodFrame = { art: string; bubble: string };
const STATES: Record<string, MoodFrame[]> = {
  neutral:  [
    { art: buildCrabFrame({ offset: 0, eyes: 'neutral', legs: 'right' }), bubble: '' },
    { art: buildCrabFrame({ offset: 1, eyes: 'blink',   legs: 'left'  }), bubble: '' },
  ],
  thinking: [
    { art: buildCrabFrame({ offset: 0, eyes: 'neutral', legs: 'right'  }), bubble: 'thinking...' },
    { art: buildCrabFrame({ offset: 1, eyes: 'blink',   legs: 'left'   }), bubble: 'reading...' },
    { art: buildCrabFrame({ offset: 0, eyes: 'curious', legs: 'type-r' }), bubble: 'building...' },
  ],
  happy:    [
    { art: buildCrabFrame({ offset: 0, eyes: 'happy', legs: 'wide'  }), bubble: 'done!' },
    { art: buildCrabFrame({ offset: 1, eyes: 'happy', legs: 'right' }), bubble: 'nice!' },
  ],
  excited:  [
    { art: buildCrabFrame({ offset: 0, eyes: 'happy',   legs: 'wide'  }), bubble: 'lets go!' },
    { art: buildCrabFrame({ offset: 1, eyes: 'curious', legs: 'wide'  }), bubble: 'all green!' },
    { art: buildCrabFrame({ offset: 0, eyes: 'happy',   legs: 'left'  }), bubble: 'more!' },
  ],
  sad:      [
    { art: buildCrabFrame({ offset: 0, eyes: 'tired', legs: 'tucked' }), bubble: 'oops...' },
    { art: buildCrabFrame({ offset: 1, eyes: 'tired', legs: 'tucked' }), bubble: 'retry?' },
  ],
};

function phaseToMood(phase: Phase): keyof typeof STATES {
  if (phase === 'done') return 'excited';
  if (phase === 'error') return 'sad';
  if (['ingest','extract','assemble','evaluate','validate'].includes(phase)) return 'thinking';
  return 'neutral';
}

// ── Mini mascot — bottom-right corner ──────────────────────────────
export function CrabMascot() {
  const phase = useCompilationStore(s => s.phase);
  const mood = phaseToMood(phase);
  const frames = STATES[mood] ?? STATES.neutral;
  const [frameIdx, setFrameIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFrameIdx(0);
    timerRef.current = setInterval(() => {
      setFrameIdx(i => (i + 1) % frames.length);
    }, mood === 'thinking' ? 800 : mood === 'excited' ? 600 : 1400);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [mood]);

  const frame = frames[frameIdx] ?? frames[0];
  const showBubble = !!frame.bubble;

  return (
    <div style={{
      position: 'absolute',
      bottom: 80,
      right: 12,
      opacity: 0.55,
      transition: 'opacity 0.2s',
      zIndex: 10,
      cursor: 'default',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.55'; }}
    >
      {/* Speech bubble */}
      {showBubble && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: 4,
          background: 'var(--crab-bg)',
          border: '0.5px solid var(--crab-border)',
          borderRadius: '8px 8px 2px 8px',
          padding: '4px 8px',
          fontSize: 10,
          whiteSpace: 'nowrap',
          color: 'var(--crab-text-secondary)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          animation: 'bubblePop 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          {frame.bubble}
        </div>
      )}
      {/* ASCII art */}
      <pre style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8,
        lineHeight: 1,
        color: 'var(--crab-accent)',
        userSelect: 'none',
        margin: 0,
      }}>
        {frame.art}
      </pre>
    </div>
  );
}

// ── Big mascot for welcome screen ───────────────────────────────────
export function CrabMascotWelcome() {
  const FRAMES = [
    buildCrabFrame({ eyes: 'neutral', legs: 'right' }),
    buildCrabFrame({ eyes: 'blink',   legs: 'right' }),
    buildCrabFrame({ eyes: 'neutral', legs: 'left'  }),
    buildCrabFrame({ eyes: 'blink',   legs: 'left'  }),
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % FRAMES.length), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <pre style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 16,
      lineHeight: 1.0,
      letterSpacing: '-1px',
      color: 'var(--crab-accent)',
      userSelect: 'none',
      textAlign: 'left',
      display: 'inline-block',
      filter: 'drop-shadow(0 0 10px color-mix(in srgb, var(--crab-accent) 40%, transparent))',
      margin: 0,
    }}>
      {FRAMES[idx]}
    </pre>
  );
}

// ── Tiny ASCII logo for header ───────────────────────────────────────
export function CrabLogoAscii() {
  // 3-line ultra mini crab that fits in header
  const mini = `${buildCrabFrame({ eyes: 'neutral', legs: 'right' })}`;
  return (
    <pre style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 5,
      lineHeight: 1,
      color: 'var(--crab-accent)',
      userSelect: 'none',
      margin: 0,
      minWidth: 40,
      minHeight: 25,
      display: 'flex',
      alignItems: 'center',
    }}>
      {mini}
    </pre>
  );
}
