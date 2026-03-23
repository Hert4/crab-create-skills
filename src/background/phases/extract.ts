import * as llm from '../llm';
import { INTENT_PROMPT } from '../prompts/intent';
import { STEPS_PROMPT } from '../prompts/steps';
import { CONSTRAINTS_PROMPT } from '../prompts/constraints';
import type { IntentResult, StepResult, ConstraintResult } from '../../sidepanel/lib/types';

export async function extract(documentText: string): Promise<{
  intent: IntentResult;
  steps: StepResult;
  constraints: ConstraintResult;
}> {
  // Run 3 extractions in parallel
  const [intent, steps, constraints] = await Promise.all([
    llm.chatJSON<IntentResult>({
      system: INTENT_PROMPT,
      user: documentText,
      temperature: 0.2,
    }),
    llm.chatJSON<StepResult>({
      system: STEPS_PROMPT,
      user: documentText,
      temperature: 0.2,
    }),
    llm.chatJSON<ConstraintResult>({
      system: CONSTRAINTS_PROMPT,
      user: documentText,
      temperature: 0.2,
    }),
  ]);

  return { intent, steps, constraints };
}
