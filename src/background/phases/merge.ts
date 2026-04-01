import * as llm from '../llm';
import { MERGER_PROMPT, SOP_EXTRACTOR_PROMPT, PATCH_APPLY_PROMPT } from '../prompts/merger';
import type { SkillPatch, SopPattern, EvolutionResult } from '../../sidepanel/lib/types';

const BATCH_SIZE = 8;

interface ConsolidatedPatch {
  consolidatedAdditions: string[];
  consolidatedRemovals: string[];
  patternsSummary: string;
}

interface SopExtractorRaw {
  patterns: {
    title: string;
    description: string;
    category: string;
  }[];
}

/**
 * Merge a single batch of patches into a consolidated patch.
 */
async function mergeBatch(
  patches: SkillPatch[],
  skillContent: string,
): Promise<ConsolidatedPatch> {
  try {
    return await llm.chatJSON<ConsolidatedPatch>({
      system: MERGER_PROMPT,
      user: JSON.stringify({
        current_skill: skillContent,
        patches: patches.map(p => ({
          analystType: p.analystType,
          rootCause: p.rootCause,
          proposedAdditions: p.proposedAdditions,
          proposedRemovals: p.proposedRemovals,
          confidence: p.confidence,
          generalizationReason: p.generalizationReason,
        })),
      }),
      temperature: 0.2,
    });
  } catch {
    // Fallback: collect all additions/removals naively
    const additions = patches.flatMap(p => p.proposedAdditions);
    const removals = patches.flatMap(p => p.proposedRemovals);
    return {
      consolidatedAdditions: [...new Set(additions)],
      consolidatedRemovals: [...new Set(removals)],
      patternsSummary: 'Merged from batch',
    };
  }
}

/**
 * Convert a ConsolidatedPatch to a SkillPatch-like object for further merging.
 */
function consolidatedToSkillPatch(cp: ConsolidatedPatch, idx: number): SkillPatch {
  return {
    trajectoryId: -(idx + 1),     // negative id = synthetic consolidated patch
    analystType: 'error',          // doesn't matter at this stage
    rootCause: cp.patternsSummary,
    proposedAdditions: cp.consolidatedAdditions,
    proposedRemovals: cp.consolidatedRemovals,
    confidence: 0.9,
    generalizationReason: cp.patternsSummary,
  };
}

/**
 * Hierarchical patch merging.
 * 1. Split all patches into batches of BATCH_SIZE
 * 2. Merge each batch → consolidated patch
 * 3. Repeat until only 1 consolidated patch remains
 */
async function hierarchicalMerge(
  patches: SkillPatch[],
  skillContent: string,
): Promise<ConsolidatedPatch> {
  if (patches.length === 0) {
    return { consolidatedAdditions: [], consolidatedRemovals: [], patternsSummary: 'No patches to merge' };
  }

  let current: SkillPatch[] = patches;

  while (current.length > 1) {
    // Chunk into batches
    const batches: SkillPatch[][] = [];
    for (let i = 0; i < current.length; i += BATCH_SIZE) {
      batches.push(current.slice(i, i + BATCH_SIZE));
    }

    // Merge all batches in parallel
    const merged = await Promise.all(
      batches.map((batch, idx) => mergeBatch(batch, skillContent).then(cp => consolidatedToSkillPatch(cp, idx))),
    );

    current = merged;
  }

  // Final single batch
  return mergeBatch(current, skillContent);
}

/**
 * Apply a consolidated patch to skill content.
 * Returns the evolved skill text.
 */
async function applyPatch(skillContent: string, patch: ConsolidatedPatch): Promise<string> {
  if (patch.consolidatedAdditions.length === 0 && patch.consolidatedRemovals.length === 0) {
    return skillContent;
  }

  try {
    return await llm.chat({
      system: PATCH_APPLY_PROMPT,
      user: JSON.stringify({
        skill_content: skillContent,
        consolidated_patch: {
          additions: patch.consolidatedAdditions,
          removals: patch.consolidatedRemovals,
        },
      }),
      temperature: 0.2,
    });
  } catch {
    return skillContent;
  }
}

/**
 * Extract high-level SoP patterns from the final evolved skill + consolidated patch.
 */
async function extractSopPatterns(
  evolvedSkill: string,
  finalPatch: ConsolidatedPatch,
  allPatches: SkillPatch[],
): Promise<SopPattern[]> {
  try {
    const raw = await llm.chatJSON<SopExtractorRaw>({
      system: SOP_EXTRACTOR_PROMPT,
      user: JSON.stringify({
        evolved_skill: evolvedSkill,
        final_patch: finalPatch,
        total_patches: allPatches.length,
      }),
      temperature: 0.2,
    });

    const validCategories = new Set(['verification', 'tool-selection', 'safety', 'workflow', 'other']);

    return (raw.patterns ?? []).map((p, idx) => ({
      title: p.title ?? `Pattern ${idx + 1}`,
      description: p.description ?? '',
      patchCount: Math.round(allPatches.length / Math.max(raw.patterns.length, 1)),
      category: (validCategories.has(p.category) ? p.category : 'other') as SopPattern['category'],
    }));
  } catch {
    return [];
  }
}

/**
 * Main entry point for Phase 5b Step 3.
 *
 * Given a list of patches and the original skill content:
 * 1. Hierarchically merge all patches
 * 2. Apply the final patch to evolve the skill
 * 3. Extract SoP patterns
 * 4. Return EvolutionResult
 */
export async function mergePatches(
  patches: SkillPatch[],
  skillContent: string,
  trajectoryCount: number,
): Promise<EvolutionResult & { _finalPatch: ConsolidatedPatch }> {
  // Empty case
  if (patches.length === 0) {
    return {
      trajectories: [],
      patches: [],
      sopPatterns: [],
      evolvedSkillContent: skillContent,
      patchesApplied: 0,
      patchesRejected: 0,
      _finalPatch: { consolidatedAdditions: [], consolidatedRemovals: [], patternsSummary: 'No patches' },
    };
  }

  // Step 1: Hierarchical merge
  const finalPatch = await hierarchicalMerge(patches, skillContent);

  // Step 2: Apply patch
  const evolvedSkillContent = await applyPatch(skillContent, finalPatch);

  // Step 3: Extract SoP patterns
  const sopPatterns = await extractSopPatterns(evolvedSkillContent, finalPatch, patches);

  const patchesApplied = finalPatch.consolidatedAdditions.length + finalPatch.consolidatedRemovals.length > 0
    ? patches.length
    : 0;
  const patchesRejected = trajectoryCount - patchesApplied;

  return {
    trajectories: [],  // filled in pipeline.ts where trajectory data is available
    patches,
    sopPatterns,
    evolvedSkillContent,
    patchesApplied,
    patchesRejected: Math.max(0, patchesRejected),
    _finalPatch: finalPatch,
  };
}
