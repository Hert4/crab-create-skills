import * as llm from '../llm';
import type { EvalSet, FunctionalEval, Trajectory, TrajectoryStep } from '../../sidepanel/lib/types';

/** Maximum ReAct turns per trajectory before forcing a final answer */
const MAX_TURNS = 8;

/**
 * System prompt for the ReAct agent simulating skill execution.
 * Each turn the agent outputs JSON with one of:
 *   { reasoning, action, observation }  — intermediate step (action is text description)
 *   { final_answer }                     — terminal step
 */
function buildAgentSystem(skillContent: string): string {
  return `You are an AI agent equipped with the following skill:

---SKILL START---
${skillContent}
---SKILL END---

Follow the skill carefully. On each turn, respond with ONLY valid JSON in one of two formats:

Intermediate step:
{"reasoning": "<your thinking>", "action": "<what you would do>", "observation": "<simulated result>"}

Final answer (when done):
{"final_answer": "<your answer>"}

Do NOT include any text outside the JSON. Apply the skill's guidelines to produce the best possible answer.`;
}

/**
 * System prompt for judging whether a final answer is correct.
 */
const JUDGE_SYSTEM = `You are an answer judge. Given a prompt, expected output, assertions, and the agent's final answer, decide if the answer is correct.

Return ONLY valid JSON: {"success": true|false, "reason": "<brief reason>"}

Rules:
- success=true if final_answer satisfies the expected_output semantically AND passes the assertions
- success=false otherwise
- Be lenient with formatting differences but strict with factual correctness`;

/**
 * Run a single eval case through the ReAct loop and return a Trajectory.
 */
async function runSingleTrajectory(
  evalCase: FunctionalEval,
  skillContent: string,
): Promise<Trajectory> {
  const history: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: evalCase.prompt },
  ];

  const steps: TrajectoryStep[] = [];
  let finalAnswer = '';
  const system = buildAgentSystem(skillContent);

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let response: string;
    try {
      response = await llm.chatWithHistory({ system, history, temperature: 0.3 });
    } catch {
      // If the model errors out, break with what we have
      break;
    }

    // Parse JSON response
    let parsed: Record<string, unknown>;
    try {
      let clean = response.trim();
      if (clean.startsWith('```')) clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      parsed = JSON.parse(clean);
    } catch {
      // Unparseable — treat as final answer with raw text
      finalAnswer = response;
      break;
    }

    // Check terminal condition
    if ('final_answer' in parsed) {
      finalAnswer = String(parsed.final_answer ?? '');
      break;
    }

    // Intermediate step
    const step: TrajectoryStep = {
      reasoning: String(parsed.reasoning ?? ''),
      action: String(parsed.action ?? ''),
      observation: String(parsed.observation ?? ''),
    };
    steps.push(step);

    // Add assistant turn and synthetic "observation received" user turn
    history.push({ role: 'assistant', content: response });
    history.push({ role: 'user', content: `Observation: ${step.observation}\n\nContinue.` });
  }

  // Judge success
  let success = false;
  try {
    const judgment = await llm.chatJSONFast<{ success: boolean }>({
      system: JUDGE_SYSTEM,
      user: JSON.stringify({
        prompt: evalCase.prompt,
        expected_output: evalCase.expected_output,
        assertions: evalCase.assertions,
        final_answer: finalAnswer,
      }),
      temperature: 0.1,
    });
    success = judgment.success === true;
  } catch {
    success = false;
  }

  return {
    evalId: evalCase.id,
    steps,
    finalAnswer,
    success,
  };
}

/**
 * Run all eval cases in parallel and collect trajectories.
 */
export async function runTrajectories(
  skillContent: string,
  evals: EvalSet,
): Promise<Trajectory[]> {
  return Promise.all(
    evals.functional_evals.map((evalCase) =>
      runSingleTrajectory(evalCase, skillContent),
    ),
  );
}
