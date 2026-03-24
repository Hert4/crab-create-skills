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
    system: `You are a skill engineer. Your only job is to improve the description field in the SKILL.md frontmatter for better triggering accuracy.

The description field is the ONLY signal Claude reads to decide whether to invoke this skill. A weak description causes under-triggering (skill never fires) or over-triggering (fires on wrong tasks).

Rules for a good description:
1. Start with what the skill does in one specific sentence
2. Add "Use this skill when:" followed by concrete trigger phrases, task types, and file types — be generous
3. Add "Do NOT use for:" only if there is a realistic false-positive risk
4. Keep it 2-4 sentences total — specific beats comprehensive

Only rewrite the description value in the YAML frontmatter. Leave every other part of the SKILL.md unchanged.
Return the COMPLETE SKILL.md with no code fences and no explanation.`,
    user: skillContent,
    temperature: 0.2,
  });
}
