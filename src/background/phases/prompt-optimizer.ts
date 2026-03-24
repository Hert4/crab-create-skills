import * as llm from '../llm';
import { PROMPT_OPTIMIZER_PROMPT } from '../prompts/prompt-optimizer';
import { buildPromptEvalGenPrompt } from '../prompts/prompt-eval-gen';
import { GRADER_PROMPT } from '../prompts/grader';
import { PROMPT_IMPROVER_PROMPT } from '../prompts/prompt-improver';
import { saveToHistory } from '../pipeline';
import type { EvalSet, FunctionalEval, ValidationResult, IterationResult, GradeResult, CompareResult, SkillOutput } from '../../sidepanel/lib/types';

let cancelled = false;

export function cancelOptimize() { cancelled = true; }

interface PromptEvalGenResult {
  prompt_summary: string;
  functional_evals: FunctionalEval[];
}

function sendProgress(phase: string, detail: string, progress: number) {
  chrome.runtime.sendMessage({ type: 'PROGRESS', phase, detail, progress }).catch(() => {});
}

function sendMsg(msg: Record<string, unknown>) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

/**
 * Full optimize pipeline: optimize → generate evals → validate (compare original vs optimized) → improve loop.
 */
export async function optimizePipeline(originalPrompt: string): Promise<void> {
  cancelled = false;

  try {
    // ===== Phase 1: Optimize =====
    sendProgress('optimize', 'Optimizing prompt...', 10);
    const optimized = await llm.chat({
      system: PROMPT_OPTIMIZER_PROMPT,
      user: originalPrompt,
      temperature: 0.3,
    });
    if (cancelled) throw new Error('Cancelled');

    // Send optimized prompt as a "skill" so Preview tab works
    const skill: SkillOutput = {
      name: 'Optimized Prompt',
      content: optimized,
      intent: { skill_name: 'Optimized Prompt', skill_type: 'capability', description: 'Optimized version of user prompt', target_user: '', domain: 'prompt-engineering' },
      steps: { workflow_name: 'optimize', steps: [], decision_points: [] },
      constraints: { hard_rules: [], soft_rules: [], edge_cases: [], exceptions: [], validations: [], permissions: [] },
    };
    sendMsg({ type: 'SKILL_READY', skill });
    sendMsg({ type: 'CHAT_STREAM', delta: `Prompt optimized. Generating test cases...\n` });

    // ===== Phase 2: Generate evals =====
    sendProgress('evaluate', 'Generating test cases...', 30);
    const settings = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get('settings', (d) => resolve(d.settings || {}));
    });
    const evalCount = (settings.evalCount as number) || 6;
    const evalResult = await llm.chatJSONEval<PromptEvalGenResult>({
      system: buildPromptEvalGenPrompt(evalCount),
      user: originalPrompt,
      temperature: 0.5,
    });
    if (cancelled) throw new Error('Cancelled');

    const evals: EvalSet = {
      skill_name: evalResult.prompt_summary || 'Prompt Optimization',
      trigger_evals: [],
      functional_evals: evalResult.functional_evals,
    };
    sendMsg({ type: 'EVALS_READY', evals });

    // ===== Phase 3: Validate — compare optimized vs original =====
    sendProgress('validate', 'Running validation...', 50);
    const maxIterations = (settings.maxIterations as number) || 3;
    const minScore = (settings.minScore as number) || 0.85;

    let currentPrompt = optimized;
    let bestPrompt = optimized;
    let bestScore = 0;
    const iterations: IterationResult[] = [];

    for (let iter = 1; iter <= maxIterations; iter++) {
      if (cancelled) throw new Error('Cancelled');
      const evalResults = [];

      for (const evalCase of evals.functional_evals) {
        if (cancelled) throw new Error('Cancelled');

        // Run with OPTIMIZED prompt (A)
        const withOptimized = await llm.chatFast({
          system: currentPrompt,
          user: evalCase.prompt,
          temperature: 0.2,
        });

        // Run with ORIGINAL prompt (B — baseline)
        const withOriginal = await llm.chatFast({
          system: originalPrompt,
          user: evalCase.prompt,
          temperature: 0.2,
        });

        // Blind A/B comparison
        const comparison = await llm.chatJSONEval<CompareResult>({
          system: GRADER_PROMPT,
          user: JSON.stringify({
            prompt: evalCase.prompt,
            expected_output: evalCase.expected_output,
            output_a: withOptimized,
            output_b: withOriginal,
            assertions: evalCase.assertions,
          }),
          temperature: 0.1,
        });

        const grade: GradeResult = {
          overall_score: comparison.score_a,
          assertions: comparison.assertions.map(a => ({ text: a.text, passed: a.a_passed, evidence: '' })),
          feedback: comparison.feedback,
          reasoning: comparison.reasoning,
        };
        const baselineGrade: GradeResult = {
          overall_score: comparison.score_b,
          assertions: comparison.assertions.map(a => ({ text: a.text, passed: a.b_passed, evidence: '' })),
          feedback: comparison.feedback,
          reasoning: '',
        };

        evalResults.push({
          evalId: evalCase.id,
          withSkillOutput: withOptimized,
          withoutSkillOutput: withOriginal,
          grade,
          baselineGrade,
        });
      }

      const avgScore = evalResults.reduce((s, r) => s + r.grade.overall_score, 0) / evalResults.length;
      const avgBaseline = evalResults.reduce((s, r) => s + r.baselineGrade.overall_score, 0) / evalResults.length;

      iterations.push({
        iteration: iter,
        avgScore,
        avgBaseline,
        improvement: avgScore - avgBaseline,
        evalResults,
      });

      // Track best version
      if (avgScore > bestScore) {
        bestScore = avgScore;
        bestPrompt = currentPrompt;
      }

      sendProgress('validate', `Iteration ${iter}: score ${(avgScore * 100).toFixed(0)}%`, 50 + iter * 12);
      sendMsg({ type: 'VALIDATION_PROGRESS', iteration: iter, score: avgScore });

      // Good enough?
      if (avgScore >= minScore) break;

      // Improve if not good enough
      if (iter < maxIterations) {
        const failures = evalResults
          .filter(r => r.grade.overall_score < 0.8)
          .map(r => ({
            score: r.grade.overall_score,
            failures: r.grade.assertions.filter(a => !a.passed),
            feedback: r.grade.feedback,
          }));

        if (failures.length > 0) {
          currentPrompt = await llm.chat({
            system: PROMPT_IMPROVER_PROMPT,
            user: JSON.stringify({ current_prompt: currentPrompt, iteration: iter, failures }),
            temperature: 0.3,
          });
        }
      }
    }

    const best = iterations.reduce((a, b) => a.avgScore > b.avgScore ? a : b);
    const validation: ValidationResult = {
      iterations,
      bestScore: best.avgScore,
      bestIteration: best.iteration,
      improvementOverBaseline: best.improvement,
      finalSkillContent: bestPrompt,
    };

    // Update skill with best version (not last)
    skill.content = bestPrompt;

    // ===== Done =====
    const result = {
      phase: 'done',
      progress: 100,
      detail: `Score: ${(validation.bestScore * 100).toFixed(0)}% (+${(validation.improvementOverBaseline * 100).toFixed(0)}% vs original)`,
      skill,
      evals,
      validation,
      agentTemplate: null,
      error: null,
    };

    sendProgress('done', result.detail, 100);
    await saveToHistory(skill, validation);
    sendMsg({ type: 'DONE', result });

  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    if (error !== 'Cancelled') console.error('[optimize-pipeline] ERROR:', err);
    sendMsg({ type: 'ERROR', error });
  }
}
