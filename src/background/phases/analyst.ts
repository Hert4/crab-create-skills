import * as llm from '../llm';
import { ANALYST_ERROR_PROMPT } from '../prompts/analyst-error';
import { ANALYST_SUCCESS_PROMPT } from '../prompts/analyst-success';
import type { Trajectory, SkillPatch } from '../../sidepanel/lib/types';

interface ErrorAnalystRaw {
  skip?: boolean;
  rootCause?: string;
  proposedAdditions?: string[];
  proposedRemovals?: string[];
  confidence?: number;
  generalizationReason?: string;
}

interface SuccessAnalystRaw {
  skip?: boolean;
  proposedAdditions?: string[];
  confidence?: number;
  generalizationReason?: string;
}

/**
 * Error Analyst (𝒜⁻): analyzes a FAILED trajectory and proposes a patch.
 * Uses strong model for deeper diagnostic capability.
 * Returns null if the analyst decides to skip (one-off failure).
 */
async function runErrorAnalyst(
  trajectory: Trajectory,
  skillContent: string,
): Promise<SkillPatch | null> {
  let result: ErrorAnalystRaw;
  try {
    result = await llm.chatJSON<ErrorAnalystRaw>({
      system: ANALYST_ERROR_PROMPT,
      user: JSON.stringify({
        current_skill: skillContent,
        trajectory: {
          evalId: trajectory.evalId,
          steps: trajectory.steps,
          finalAnswer: trajectory.finalAnswer,
          success: false,
        },
      }),
      temperature: 0.2,
    });
  } catch {
    return null;
  }

  if (result.skip === true) return null;

  return {
    trajectoryId: trajectory.evalId,
    analystType: 'error',
    rootCause: result.rootCause ?? '',
    proposedAdditions: result.proposedAdditions ?? [],
    proposedRemovals: result.proposedRemovals ?? [],
    confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    generalizationReason: result.generalizationReason ?? '',
  };
}

/**
 * Success Analyst (𝒜⁺): analyzes a SUCCESSFUL trajectory and proposes additions.
 * Single-pass design: successful traces don't need interactive diagnosis.
 * Returns null if the analyst decides to skip (skill already covers this).
 */
async function runSuccessAnalyst(
  trajectory: Trajectory,
  skillContent: string,
): Promise<SkillPatch | null> {
  let result: SuccessAnalystRaw;
  try {
    result = await llm.chatJSON<SuccessAnalystRaw>({
      system: ANALYST_SUCCESS_PROMPT,
      user: JSON.stringify({
        current_skill: skillContent,
        trajectory: {
          evalId: trajectory.evalId,
          steps: trajectory.steps,
          finalAnswer: trajectory.finalAnswer,
          success: true,
        },
      }),
      temperature: 0.2,
    });
  } catch {
    return null;
  }

  if (result.skip === true) return null;
  if (!result.proposedAdditions || result.proposedAdditions.length === 0) return null;

  return {
    trajectoryId: trajectory.evalId,
    analystType: 'success',
    rootCause: '',   // Success analysts don't diagnose failures
    proposedAdditions: result.proposedAdditions,
    proposedRemovals: [],  // Success analysts never remove guidance
    confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    generalizationReason: result.generalizationReason ?? '',
  };
}

/**
 * Dispatch the full analyst fleet in parallel.
 * Error trajectories → Error Analyst
 * Success trajectories → Success Analyst
 * Returns all non-null patches.
 */
export async function runAnalystFleet(
  trajectories: Trajectory[],
  skillContent: string,
): Promise<SkillPatch[]> {
  const patches = await Promise.all(
    trajectories.map((t) =>
      t.success
        ? runSuccessAnalyst(t, skillContent)
        : runErrorAnalyst(t, skillContent),
    ),
  );

  return patches.filter((p): p is SkillPatch => p !== null);
}
