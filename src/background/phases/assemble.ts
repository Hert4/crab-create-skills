import * as llm from '../llm';
import { ASSEMBLY_PROMPT } from '../prompts/assembly';
import type { IntentResult, StepResult, ConstraintResult, SkillOutput } from '../../sidepanel/lib/types';

export async function assemble(
  intent: IntentResult,
  steps: StepResult,
  constraints: ConstraintResult,
): Promise<SkillOutput> {
  const inputJSON = JSON.stringify({ intent, steps, constraints }, null, 2);

  const content = await llm.chat({
    system: ASSEMBLY_PROMPT,
    user: inputJSON,
    temperature: 0.3,
  });

  return {
    name: intent.skill_name,
    content,
    intent,
    steps,
    constraints,
  };
}

export async function optimizeDescription(skillContent: string): Promise<string> {
  return llm.chatFast({
    system: 'You improve skill descriptions for better triggering. The description field determines when Claude invokes a skill. Make it broader, more specific about user contexts/phrases, and pushy. Include specific trigger contexts. Return ONLY the complete improved SKILL.md with no code fences.',
    user: skillContent,
    temperature: 0.3,
  });
}
