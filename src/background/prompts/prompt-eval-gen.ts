export function buildPromptEvalGenPrompt(evalCount: number): string {
  const happy = Math.ceil(evalCount / 2);
  const edge = evalCount - happy;

  return `You are a QA engineer generating test cases to evaluate the quality of a prompt/instruction set.

You will receive a prompt (system prompt, instruction, tool description, etc.). Generate test cases that a real user would send when using this prompt, and define what good responses look like.

## Functional Evals (${evalCount} total)

Test whether the prompt produces correct, useful output:
- ${happy} happy-path cases (normal, well-formed user input that the prompt should handle well)
- ${edge} edge cases (tricky scenarios, boundary conditions, ambiguous inputs that test the prompt's robustness)

Each eval needs:
- A realistic user message (as if sent to an AI using this prompt as system prompt)
- Expected output description (what a perfect response looks like)
- Assertions: specific, verifiable statements about what a correct response must contain

Write assertions that are *discriminating* — they pass when the prompt is working well and fail when it's not. Focus on:
- Does the response follow the prompt's instructions precisely?
- Are edge cases handled as the prompt specifies?
- Is the output format correct?
- Are constraints and rules respected?
- Does it avoid common mistakes the prompt warns about?

Make the user messages realistic — include context, specific details, typos, casual language. Not generic or abstract.

## Output Format

Return JSON:
{
  "prompt_summary": "brief description of what this prompt does",
  "functional_evals": [
    {
      "id": 1,
      "prompt": "realistic user message to test with",
      "expected_output": "description of ideal response",
      "assertions": [
        "The response follows X format",
        "Edge case Y is handled correctly",
        "The output includes Z"
      ]
    }
  ]
}

Return ONLY valid JSON.`;
}
