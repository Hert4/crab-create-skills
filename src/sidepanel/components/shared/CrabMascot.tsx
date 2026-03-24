import { useEffect, useRef, useState, useCallback } from 'react';
import { useCompilationStore } from '@/stores/compilationStore';
import { useChatStore } from '@/stores/chatStore';
import { PHASE_ANIMATION, getAnimationUrl, type AnimationId } from '@/lib/animations';

// ── Speech bubble messages per animation ────────────────────────────
const BUBBLES: Partial<Record<AnimationId, string[]>> = {
  'clawd-working-typing':    ['typing...', 'reading...'],
  'clawd-working-thinking':  ['thinking...', 'hmm...'],
  'clawd-working-building':  ['building...', 'assembling...'],
  'clawd-working-juggling':  ['evaluating...', 'testing...'],
  'clawd-working-debugger':  ['validating...', 'checking...'],
  'clawd-working-conducting':['conducting...', 'orchestrating...'],
  'clawd-working-wizard':    ['optimizing...', 'refining...'],
  'clawd-happy':             ['done!', 'nice!', 'lets go!'],
  'clawd-disconnected':      ['oops...', 'retry?'],
  'clawd-dizzy':             ['uhh...', 'help...'],
  'clawd-sleeping':          ['zzz...', 'sleepy...'],
  'clawd-crab-walking':      ['stretching~', 'walking~'],
  'clawd-notification':      ['hey!', 'psst!'],
  'clawd-going-away':        ['brb~', 'later~'],
  'clawd-working-sweeping':  ['cleaning~', 'tidy up~'],
  'clawd-working-beacon':    ['looking...', 'scanning...'],
};

// ── Idle animation pool — cycled when no activity ────────────────────
const IDLE_ANIMATIONS: { id: AnimationId; weight: number; minDuration: number }[] = [
  { id: 'clawd-idle-living',       weight: 4, minDuration: 16000 }, // main idle, longer
  { id: 'clawd-sleeping',          weight: 2, minDuration: 12000 },
  { id: 'clawd-crab-walking',      weight: 2, minDuration: 8000  },
  { id: 'clawd-notification',      weight: 1, minDuration: 6000  },
  { id: 'clawd-working-sweeping',  weight: 1, minDuration: 8000  },
  { id: 'clawd-working-beacon',    weight: 1, minDuration: 8000  },
  { id: 'clawd-going-away',        weight: 1, minDuration: 8000  },
  { id: 'clawd-mini-clawd',        weight: 1, minDuration: 6000  },
];

function pickRandomIdle(exclude?: AnimationId): { id: AnimationId; minDuration: number } {
  const pool = IDLE_ANIMATIONS.filter(a => a.id !== exclude);
  const totalWeight = pool.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * totalWeight;
  for (const a of pool) {
    r -= a.weight;
    if (r <= 0) return a;
  }
  return pool[pool.length - 1];
}

// ── Crossfade SVG — smooth transition between two stacked <img> ─────
function CrossfadeSvg({ src }: { src: string }) {
  const [slots, setSlots] = useState([src, '']);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (src === slots[active]) return;
    const next = active === 0 ? 1 : 0;
    setSlots(prev => {
      const copy = [...prev];
      copy[next] = src;
      return copy;
    });
    // Wait one frame so the new img src is painted before opacity transition
    requestAnimationFrame(() => setActive(next));
  }, [src]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {slots.map((s, i) => s && (
        <img
          key={i}
          src={s}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center bottom',
            opacity: i === active ? 1 : 0,
            transition: 'opacity 0.4s ease-in-out',
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
}

// ── Derive current animation from compilation phase + chat state ─────
// When truly idle, cycle through random idle animations for variety.
function useActiveAnimation(): AnimationId {
  const phase = useCompilationStore(s => s.phase);
  const storeAnimation = useCompilationStore(s => s.animation) as AnimationId;
  const isProcessing = useChatStore(s => s.isProcessing);
  const [idleAnim, setIdleAnim] = useState<AnimationId>('clawd-idle-living');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isIdle = phase === 'idle' && !isProcessing;

  const scheduleNext = useCallback((current: AnimationId) => {
    const next = pickRandomIdle(current);
    idleTimerRef.current = setTimeout(() => {
      setIdleAnim(next.id);
      scheduleNext(next.id);
    }, next.minDuration + Math.random() * 4000); // add some randomness
  }, []);

  useEffect(() => {
    if (isIdle) {
      // Start cycling after an initial delay
      const first = pickRandomIdle(idleAnim);
      idleTimerRef.current = setTimeout(() => {
        setIdleAnim(first.id);
        scheduleNext(first.id);
      }, 10000 + Math.random() * 5000); // first switch after 10-15s of idle
    } else {
      // Not idle — clear timer, reset to default
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
      setIdleAnim('clawd-idle-living');
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isIdle]);

  if (phase !== 'idle' && phase !== 'error') return PHASE_ANIMATION[phase];
  if (phase === 'error') return 'clawd-disconnected';
  if (isProcessing) return 'clawd-working-thinking';
  // If model set a specific animation (from chat response), show it briefly
  // then idle cycling takes over
  if (storeAnimation !== 'clawd-idle-living') return storeAnimation;
  return idleAnim;
}

// ── Mini mascot — bottom-right corner ──────────────────────────────
export function CrabMascot() {
  const animation = useActiveAnimation();
  const src = getAnimationUrl(animation);
  const msgs = BUBBLES[animation] ?? [];
  const [msgIdx, setMsgIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setMsgIdx(0);
    if (msgs.length > 0) {
      timerRef.current = setInterval(
        () => setMsgIdx(i => (i + 1) % msgs.length),
        1200,
      );
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [animation]);

  const bubble = msgs[msgIdx] ?? '';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        right: 12,
        opacity: 0.55,
        transition: 'opacity 0.2s',
        zIndex: 10,
        cursor: 'default',
        width: 120,
        height: 120,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.55'; }}
    >
      {bubble && (
        <div key={bubble} style={{
          position: 'absolute',
          bottom: '100%',
          right: 0,
          marginBottom: 6,
          background: 'var(--crab-bg)',
          border: '0.5px solid var(--crab-border)',
          borderRadius: '10px 10px 2px 10px',
          padding: '5px 10px',
          fontSize: 12,
          whiteSpace: 'nowrap',
          color: 'var(--crab-text-secondary)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          animation: 'bubblePop 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          {bubble}
        </div>
      )}
      <CrossfadeSvg src={src} />
    </div>
  );
}

// ── Big mascot for welcome screen ───────────────────────────────────
// ── Idle animation cycling for welcome screen ──────────────────────
const WELCOME_ANIMATIONS: { id: AnimationId; duration: number }[] = [
  { id: 'clawd-idle-living',       duration: 14000 },
  { id: 'clawd-crab-walking',      duration: 8000  },
  { id: 'clawd-idle-living',       duration: 10000 },
  { id: 'clawd-notification',      duration: 6000  },
  { id: 'clawd-idle-living',       duration: 12000 },
  { id: 'clawd-sleeping',          duration: 10000 },
  { id: 'clawd-idle-living',       duration: 10000 },
  { id: 'clawd-working-sweeping',  duration: 8000  },
  { id: 'clawd-idle-living',       duration: 12000 },
  { id: 'clawd-going-away',        duration: 8000  },
  { id: 'clawd-idle-living',       duration: 10000 },
  { id: 'clawd-working-beacon',    duration: 8000  },
];

export function CrabMascotWelcome() {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const schedule = (i: number) => {
      timerRef.current = setTimeout(() => {
        const next = (i + 1) % WELCOME_ANIMATIONS.length;
        setIdx(next);
        schedule(next);
      }, WELCOME_ANIMATIONS[i].duration);
    };
    schedule(idx);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const anim = WELCOME_ANIMATIONS[idx];
  const src = getAnimationUrl(anim.id);

  return (
    <div style={{
      width: 200,
      height: 200,
      display: 'inline-block',
      filter: 'drop-shadow(0 0 14px color-mix(in srgb, var(--crab-accent) 40%, transparent))',
    }}>
      <CrossfadeSvg src={src} />
    </div>
  );
}

// ── Tiny logo for header ───────────────────────────────────────────
export function CrabLogoAscii() {
  const src = getAnimationUrl('clawd-static-base');
  return (
    <div style={{ width: 28, height: 22, display: 'flex', alignItems: 'center' }}>
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
}
