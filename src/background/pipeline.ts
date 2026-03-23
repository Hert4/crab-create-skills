import { ingest } from './phases/ingest';
import { extract } from './phases/extract';
import { assemble, optimizeDescription } from './phases/assemble';
import { detectTools } from './phases/detect';
import { generateToolSchemas } from './phases/tool-schema';
import { generateEvals } from './phases/evaluate';
import { validate } from './phases/validate';
import { assembleAgent } from './phases/agent-assembly';
import type { ParsedFile, CompilationState, SkillOutput, AgentTemplate } from '../sidepanel/lib/types';

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
    sendProgress('ingest', 'Analyzing files...', 8);
    const documentText = await ingest(files, userMessage);
    if (cancelled) throw new Error('Cancelled');

    // ===== Phase 2: Extract + Detect (parallel) =====
    sendProgress('extract', 'Extracting business logic...', 20);
    const [{ intent, steps, constraints }, detectedTools] = await Promise.all([
      extract(documentText),
      detectTools(documentText),
    ]);
    if (cancelled) throw new Error('Cancelled');

    sendMsg({
      type: 'CHAT_STREAM',
      delta: `Skill: **${intent.skill_name}** (${intent.skill_type})\n` +
             `${steps.steps.length} steps · ${constraints.hard_rules.length} rules · ${detectedTools.length} tools\n`,
    });

    // ===== Phase 3a: Tool Schemas (sync, no LLM) =====
    const toolOutput = generateToolSchemas(detectedTools);

    // ===== Phase 3b: Assemble SKILL.md =====
    sendProgress('assemble', 'Generating SKILL.md...', 38);
    const skill = await assemble(intent, steps, constraints);
    if (cancelled) throw new Error('Cancelled');

    // Optimize description for better triggering
    sendProgress('assemble', 'Optimizing description...', 44);
    skill.content = await optimizeDescription(skill.content);

    sendMsg({ type: 'SKILL_READY', skill });

    // ===== Phase 4: Generate Evals =====
    sendProgress('evaluate', 'Generating test cases...', 54);
    const evals = await generateEvals(intent, steps, constraints);
    if (cancelled) throw new Error('Cancelled');

    sendMsg({ type: 'EVALS_READY', evals });

    // ===== Phase 5: Validate =====
    sendProgress('validate', 'Running validation...', 64);
    const settings = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get('settings', (d) => resolve(d.settings || {}));
    });
    const validation = await validate(
      skill,
      evals,
      (settings.maxIterations as number) || 3,
      (settings.minScore as number) || 0.85,
      (iter, score) => {
        sendProgress('validate', `Iteration ${iter}: score ${(score * 100).toFixed(0)}%`, 64 + iter * 5);
        sendMsg({ type: 'VALIDATION_PROGRESS', iteration: iter, score });
      },
    );

    if (validation.finalSkillContent) {
      skill.content = validation.finalSkillContent;
    }

    // ===== Phase 6: Agent Assembly =====
    sendProgress('agent', 'Assembling agent template...', 88);
    const modelFast = (settings.modelFast as string) || '';
    const agentTemplate: AgentTemplate = await assembleAgent(
      intent,
      steps,
      constraints,
      skill.content,
      toolOutput,
      modelFast,
    );
    if (cancelled) throw new Error('Cancelled');

    sendMsg({ type: 'AGENT_READY', agentTemplate });

    // ===== Done =====
    const result: CompilationState = {
      phase: 'done',
      progress: 100,
      detail: `Score: ${(validation.bestScore * 100).toFixed(0)}% (+${(validation.improvementOverBaseline * 100).toFixed(0)}% vs baseline)`,
      skill,
      evals,
      validation,
      agentTemplate,
      error: null,
    };

    await saveToHistory(skill, validation);
    sendProgress('done', result.detail, 100);
    sendMsg({ type: 'DONE', result });
    return result;

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[pipeline] ERROR:', err);
    sendMsg({ type: 'ERROR', error });
    return { phase: 'error', progress: 0, detail: '', skill: null, evals: null, validation: null, agentTemplate: null, error };
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
