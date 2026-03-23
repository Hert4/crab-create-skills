import * as llm from '../llm';
import { GRADER_PROMPT } from '../prompts/grader';
import { IMPROVER_PROMPT } from '../prompts/improver';
import type { SkillOutput, EvalSet, ValidationResult, IterationResult, GradeResult, CompareResult } from '../../sidepanel/lib/types';

export async function validate(
  skill: SkillOutput,
  evals: EvalSet,
  maxIterations: number,
  minScore: number,
  onProgress: (iteration: number, score: number) => void,
): Promise<ValidationResult> {
  let skillContent = skill.content;
  const iterations: IterationResult[] = [];

  for (let iter = 1; iter <= maxIterations; iter++) {
    const evalResults = [];

    for (const evalCase of evals.functional_evals) {
      // Execute WITH skill (fast model)
      const withSkill = await llm.chatFast({
        system: `You have this skill:\n\n${skillContent}\n\nFollow it.`,
        user: evalCase.prompt,
        temperature: 0.2,
      });

      // Execute WITHOUT skill — baseline (fast model)
      const withoutSkill = await llm.chatFast({
        system: 'You are a helpful AI assistant.',
        user: evalCase.prompt,
        temperature: 0.2,
      });

      // Blind comparison (eval model) — doesn't know which output used the skill
      const comparison = await llm.chatJSONEval<CompareResult>({
        system: GRADER_PROMPT,
        user: JSON.stringify({
          prompt: evalCase.prompt,
          expected_output: evalCase.expected_output,
          output_a: withSkill,
          output_b: withoutSkill,
          assertions: evalCase.assertions,
        }),
        temperature: 0.1,
      });

      // Map to GradeResult for withSkill (A) and withoutSkill (B)
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
        withSkillOutput: withSkill,
        withoutSkillOutput: withoutSkill,
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

    onProgress(iter, avgScore);

    // Good enough?
    if (avgScore >= minScore) break;

    // Improve — strong model rewrites the skill based on failures
    if (iter < maxIterations) {
      skillContent = await improveSkill(skillContent, evalResults.map(r => r.grade), iter);
    }
  }

  const best = iterations.reduce((a, b) => a.avgScore > b.avgScore ? a : b);

  return {
    iterations,
    bestScore: best.avgScore,
    bestIteration: best.iteration,
    improvementOverBaseline: best.improvement,
    finalSkillContent: skillContent,
  };
}

async function improveSkill(current: string, grades: GradeResult[], iteration: number): Promise<string> {
  const failures = grades
    .filter(g => g.overall_score < 0.8)
    .map(g => ({ score: g.overall_score, failures: g.assertions.filter(a => !a.passed), feedback: g.feedback }));

  if (failures.length === 0) return current;

  // Strong model: rewrites skill — this IS creative work that benefits from a better model
  return llm.chat({
    system: IMPROVER_PROMPT,
    user: JSON.stringify({ current_skill: current, iteration, failures }),
    temperature: 0.3,
  });
}
