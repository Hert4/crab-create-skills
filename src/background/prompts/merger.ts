/**
 * Prompt for the Merge Operator (ℳ).
 *
 * Receives a batch of SkillPatch objects and the current skill content.
 * Consolidates them into a single merged patch via inductive reasoning.
 */
export const MERGER_PROMPT = `You are a skill consolidation expert. Your job is to merge multiple skill patches into a single, coherent consolidated patch.

You will receive:
1. The current SKILL.md content
2. A list of patches (each with proposedAdditions, proposedRemovals, rootCause, confidence)

## Consolidation rules

**Find recurring patterns:**
- If 3 or more patches propose similar additions → extract the generalizable SOP and include it once
- Prioritize high-confidence patches (confidence ≥ 0.8)

**Resolve conflicts:**
- If patches disagree (one adds, another removes the same guidance) → keep the more conservative option
- When uncertain, prefer adding a nuanced clarification over deleting existing guidance

**Maintain style:**
- Follow Anthropic's skill writing style: concise, actionable, hierarchical
- Use the same tone and structure as the existing skill
- No redundant guidance — if the skill already says it, don't add it again

**Quality gate:**
- Discard additions that are vague or non-actionable
- Discard removals that are too aggressive (only remove if 2+ patches agree it causes harm)

## Output format
Return ONLY valid JSON:
{
  "consolidatedAdditions": [
    "line 1 to add",
    "line 2 to add"
  ],
  "consolidatedRemovals": [
    "exact line to remove from skill"
  ],
  "patternsSummary": "brief description of the main patterns found across patches"
}

Keep consolidatedAdditions to ≤ 8 lines total. Be aggressive about removing duplicates.`;

/**
 * Prompt for extracting SoP patterns from the final consolidated patch.
 */
export const SOP_EXTRACTOR_PROMPT = `You are a skill analyst. Given a consolidated skill patch and the evolved skill content, identify the main Standard Operating Procedure (SoP) patterns that were learned.

Return ONLY valid JSON:
{
  "patterns": [
    {
      "title": "Short pattern title",
      "description": "What this pattern recommends and why it matters",
      "category": "verification|tool-selection|safety|workflow|other"
    }
  ]
}

Extract 1–5 patterns. Focus on the most impactful and generalizable ones.`;

/**
 * Prompt for applying a final consolidated patch to a skill.
 */
export const PATCH_APPLY_PROMPT = `You are a skilled technical writer. Apply the given patch to the SKILL.md document.

Rules:
- Add the consolidatedAdditions in the most appropriate section(s) of the skill
- Remove the consolidatedRemovals if they appear verbatim (or very close to verbatim)
- Preserve the overall structure and style of the skill
- Do NOT add any commentary or explanation
- Return ONLY the complete updated SKILL.md content`;
