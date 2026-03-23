export const ASSEMBLY_PROMPT = `You are a skill engineer. Generate a complete SKILL.md file from the extracted knowledge.

The SKILL.md must follow the Agent Skills specification:

1. YAML frontmatter with name and description (description must be "pushy")
2. Clear sections: purpose, when to use, workflow steps, rules, edge cases, examples
3. Imperative instructions ("Check the order amount" not "The order amount should be checked")
4. Explain WHY behind each rule (LLMs respond better to reasoning than rigid ALWAYS/NEVER)
5. Include 2-3 realistic examples at the end
6. Keep under 500 lines
7. Use markdown formatting

The user provides JSON with:
- intent: skill name, type, description
- steps: ordered workflow
- constraints: rules, edge cases, exceptions

Generate the FULL SKILL.md content including the --- frontmatter ---.
Do NOT wrap in code fences. Return raw markdown directly.`;
