import { ingest } from './phases/ingest';
import { extract } from './phases/extract';
import { assemble, optimizeDescription } from './phases/assemble';
import { generateEvals } from './phases/evaluate';
import { validate } from './phases/validate';
import type { ParsedFile, CompilationState, SkillOutput } from '../sidepanel/lib/types';

let cancelled = false;

export function cancelCompilation() { cancelled = true; }

function sendProgress(phase: string, detail: string, progress: number) {
  chrome.runtime.sendMessage({ type: 'PROGRESS', phase, detail, progress }).catch(() => {});
}

function sendMsg(msg: Record<string, unknown>) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

/**
 * Main pipeline. Called from background/index.ts.
 */
export async function compile(files: ParsedFile[], userMessage: string): Promise<CompilationState> {
  cancelled = false;

  try {
    // ===== Phase 1: Ingest =====
    sendProgress('ingest', 'Analyzing files...', 10);
    const documentText = await ingest(files, userMessage);
    if (cancelled) throw new Error('Cancelled');

    // ===== Phase 2: Extract =====
    sendProgress('extract', 'Extracting business logic...', 30);
    const { intent, steps, constraints } = await extract(documentText);
    if (cancelled) throw new Error('Cancelled');

    sendMsg({
      type: 'CHAT_STREAM',
      delta: `Skill: **${intent.skill_name}** (${intent.skill_type})\n` +
             `${steps.steps.length} steps, ${constraints.hard_rules.length} rules\n`,
    });

    // ===== Phase 3: Assemble =====
    sendProgress('assemble', 'Generating SKILL.md...', 50);
    const skill = await assemble(intent, steps, constraints);
    if (cancelled) throw new Error('Cancelled');

    // Optimize description for better triggering
    sendProgress('assemble', 'Optimizing description...', 55);
    skill.content = await optimizeDescription(skill.content);

    sendMsg({ type: 'SKILL_READY', skill });

    // ===== Phase 4: Generate Evals =====
    sendProgress('evaluate', 'Generating test cases...', 65);
    const evals = await generateEvals(intent, steps, constraints);
    if (cancelled) throw new Error('Cancelled');

    sendMsg({ type: 'EVALS_READY', evals });

    // ===== Phase 5: Validate =====
    sendProgress('validate', 'Running validation...', 75);
    const settings = await new Promise<Record<string, number>>((resolve) => {
      chrome.storage.local.get('settings', (d) => resolve(d.settings || {}));
    });
    const validation = await validate(
      skill,
      evals,
      (settings.maxIterations as number) || 3,
      (settings.minScore as number) || 0.85,
      (iter, score) => {
        sendProgress('validate', `Iteration ${iter}: score ${(score * 100).toFixed(0)}%`, 75 + iter * 5);
        sendMsg({ type: 'VALIDATION_PROGRESS', iteration: iter, score });
      },
    );

    if (validation.finalSkillContent) {
      skill.content = validation.finalSkillContent;
    }

    // ===== Done =====
    const result: CompilationState = {
      phase: 'done',
      progress: 100,
      detail: `Score: ${(validation.bestScore * 100).toFixed(0)}% (+${(validation.improvementOverBaseline * 100).toFixed(0)}% vs baseline)`,
      skill,
      evals,
      validation,
      error: null,
    };

    await saveToHistory(skill, validation);
    sendProgress('done', result.detail, 100);
    sendMsg({ type: 'DONE', result });
    return result;

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    sendMsg({ type: 'ERROR', error });
    return { phase: 'error', progress: 0, detail: '', skill: null, evals: null, validation: null, error };
  }
}

async function saveToHistory(skill: SkillOutput, validation: { bestScore: number }) {
  const entry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    skillName: skill.name,
    sourceFiles: [],
    finalScore: validation.bestScore,
    skillContent: skill.content,
  };
  const { history = [] } = await chrome.storage.local.get('history');
  history.unshift(entry);
  if (history.length > 50) history.length = 50;
  await chrome.storage.local.set({ history });
}
