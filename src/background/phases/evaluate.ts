import * as llm from '../llm';
import { EVAL_GEN_PROMPT } from '../prompts/eval-gen';
import type { IntentResult, StepResult, ConstraintResult, EvalSet } from '../../sidepanel/lib/types';

export async function generateEvals(
  intent: IntentResult,
  steps: StepResult,
  constraints: ConstraintResult,
): Promise<EvalSet> {
  const context = JSON.stringify({
    skill_name: intent.skill_name,
    description: intent.description,
    domain: intent.domain,
    key_steps: steps.steps.slice(0, 5).map(s => s.action),
    key_rules: constraints.hard_rules.slice(0, 5).map(r => r.rule),
  });

  // Eval model (or falls back to fast) — generating test cases doesn't need strong model
  return llm.chatJSONEval<EvalSet>({
    system: EVAL_GEN_PROMPT,
    user: context,
    temperature: 0.5,
  });
}
