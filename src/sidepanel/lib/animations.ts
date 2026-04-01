import { z } from 'zod';
import type { Phase } from './types';

// ── All available animation IDs (matching SVG filenames in public/animations/) ──
export const ANIMATION_IDS = [
  'clawd-idle-living',
  'clawd-happy',
  'clawd-sleeping',
  'clawd-disconnected',
  'clawd-dizzy',
  'clawd-notification',
  'clawd-static-base',
  'clawd-mini-clawd',
  'clawd-crab-walking',
  'clawd-going-away',
  'clawd-working-typing',
  'clawd-working-thinking',
  'clawd-working-building',
  'clawd-working-juggling',
  'clawd-working-conducting',
  'clawd-working-confused',
  'clawd-working-sweeping',
  'clawd-working-wizard',
  'clawd-working-debugger',
  'clawd-working-pushing',
  'clawd-working-carrying',
  'clawd-working-overheated',
  'clawd-working-beacon',
] as const;

// ── Zod schema for animation ID validation ──────────────────────────
export const AnimationId = z.enum(ANIMATION_IDS);
export type AnimationId = z.infer<typeof AnimationId>;

// ── Structured chat response schema (model outputs message + animation) ──
export const ChatResponseSchema = z.object({
  message: z.string(),
  animation: AnimationId.catch('clawd-idle-living'),
});

// ── Phase → default animation mapping ───────────────────────────────
export const PHASE_ANIMATION: Record<Phase, AnimationId> = {
  idle:     'clawd-idle-living',
  ingest:   'clawd-working-typing',
  extract:  'clawd-working-thinking',
  assemble: 'clawd-working-building',
  evaluate: 'clawd-working-juggling',
  validate: 'clawd-working-debugger',
  evolve:   'clawd-working-wizard',
  agent:    'clawd-working-conducting',
  optimize: 'clawd-working-wizard',
  done:     'clawd-happy',
  error:    'clawd-disconnected',
};

// ── Subset of animations the chat model can choose from ─────────────
export const CHAT_ANIMATIONS: { id: AnimationId; mood: string }[] = [
  { id: 'clawd-idle-living',       mood: 'calm, neutral, default' },
  { id: 'clawd-happy',             mood: 'positive, success, celebration' },
  { id: 'clawd-working-thinking',  mood: 'considering, pondering, processing' },
  { id: 'clawd-working-typing',    mood: 'busy, working, active' },
  { id: 'clawd-working-confused',  mood: 'uncertain, puzzled, not sure' },
  { id: 'clawd-sleeping',          mood: 'bored, nothing to do, idle' },
  { id: 'clawd-notification',      mood: 'alert, important info, heads up' },
  { id: 'clawd-disconnected',      mood: 'error, lost, broken' },
  { id: 'clawd-dizzy',             mood: 'overwhelmed, too much' },
];

// ── Build the animation choice text for model prompts ────────────────
export const ANIMATION_PROMPT_LIST = CHAT_ANIMATIONS
  .map(a => `- ${a.id}: ${a.mood}`)
  .join('\n');

// ── Get SVG URL for an animation ────────────────────────────────────
export function getAnimationUrl(id: AnimationId): string {
  try {
    return chrome.runtime.getURL(`animations/${id}.svg`);
  } catch {
    return `/animations/${id}.svg`;
  }
}
