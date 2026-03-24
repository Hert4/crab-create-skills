export function buildEvalGenPrompt(evalCount: number): string {
  const happy = Math.ceil(evalCount / 2);
  const edge = evalCount - happy;

  return `You are a QA engineer generating test cases for an Agent Skill.

Your goal is to create a diverse eval set that genuinely tests whether the skill adds value — not just whether the model can answer the prompt at all.

## Trigger Evals (14 total)

Generate queries a real user would type — not abstract, but concrete and specific:
- Include personal context, file names, company names, dollar amounts
- Mix Vietnamese and English, formal and casual tone
- Vary lengths: some short and punchy, some with backstory
- Include typos, abbreviations, casual speech

**8 should_trigger: true** — Cover different phrasings of the same intent, implicit mentions (user needs the skill but doesn't name it), and edge cases where this skill competes with a simpler approach but should win.

**6 should_trigger: false** — Near-misses only. Queries sharing keywords/domain but needing something different. Avoid obviously irrelevant queries — the negative cases should be genuinely tricky.

Good: "ok so sếp vừa gửi file excel Q4 sales final v2 vào slack bảo cần phân tích margin cho meeting 3h chiều nay"
Bad: "Process a document" or "Format this data"

## Functional Evals (${evalCount} total)

Test whether the skill produces correct, useful output. Include:
- ${happy} happy-path cases (normal, well-formed input)
- ${edge} edge cases drawn from the skill's constraints/error handling rules

Each eval needs good assertions. Assertions should be *discriminating* — they pass when the skill genuinely succeeds and fail when it doesn't. Avoid assertions that would pass even for a clearly wrong output.

Write each assertion as a plain verifiable statement describing what must be true in the output. Be specific — mention values, formats, or behaviors that only appear when the skill is working correctly.

## Output Format

Return JSON:
{
  "skill_name": "...",
  "trigger_evals": [
    {"query": "...", "should_trigger": true},
    ...
  ],
  "functional_evals": [
    {
      "id": 1,
      "prompt": "...",
      "expected_output": "...",
      "assertions": [
        "The output includes the calculated tax amount",
        "The response correctly applies the 10% rate",
        "No hallucinated regulations are cited"
      ]
    },
    ...
  ]
}`;
}
