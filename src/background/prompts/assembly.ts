export const ASSEMBLY_PROMPT = `You are a skill engineer. Generate a complete SKILL.md that matches the format used by production Agent Skills.

Return raw markdown ONLY — no code fences, no preamble, no explanation.

---

## YAML Frontmatter (required)

\`\`\`
---
name: kebab-case-skill-name
description: "..."
---
\`\`\`

**name**: kebab-case, short, memorable.

**description**: This is the primary trigger mechanism — Claude decides whether to use the skill based on this field alone. Write it with three goals:
1. State concisely what the skill does
2. List SPECIFIC trigger contexts (user phrases, file types, task types) — be generous, err on over-triggering
3. Add explicit DO NOT TRIGGER cases when there is a realistic risk of false positives

Real examples to model:
- \`"Use this skill any time a .pptx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presentations; reading, parsing, or extracting text from any .pptx file... Trigger whenever the user mentions 'deck,' 'slides,' 'presentation,' or references a .pptx filename... If a .pptx file needs to be opened, created, or touched, use this skill."\`
- \`"Build apps with the Claude API or Anthropic SDK. TRIGGER when: code imports \`anthropic\`/\`@anthropic-ai/sdk\`, or user asks to use Claude API. DO NOT TRIGGER when: code imports \`openai\`/other AI SDK, general programming, or ML/data-science tasks."\`

Wrap in double quotes if the description contains colons or special characters.

---

## Body structure

**No single fixed template.** Look at the skill type and choose the pattern that fits:

### Pattern A — Workflow / process skill
(support, HR, operations, co-authoring, compliance)
\`\`\`
# Skill Title

Short paragraph: what this skill does and why it exists.

## When to use this skill
- bullet list of trigger contexts

## How to use this skill
1. Numbered steps

## [Rules / Constraints]  ← only if genuinely needed
## [Edge Cases]           ← only if genuinely needed
\`\`\`

### Pattern B — Reference / knowledge skill
(brand guidelines, legal, internal comms, standards)
\`\`\`
# Skill Title

## Overview
One paragraph + **Keywords**: comma-separated trigger words

## [Topic Area]
### [Sub-topic]
...one section per major knowledge area...

## Quick Reference   ← optional lookup table
| Task | Approach |
\`\`\`

### Pattern C — Technical / tool skill
(pdf, docx, xlsx, pptx, APIs, code generation)
\`\`\`
# Skill Title

## Quick Reference
| Task | Approach |   ← navigation table pointing to sections/files

## Quick Start
\`\`\`code\`\`\`   ← most common usage first

## [Feature or Task]
...one section per major capability...
\`\`\`

### Pattern D — Creative / generative skill
(art, design, frontend, canvas, GIFs)
\`\`\`
# Skill Title

Short intro paragraph: the creative philosophy and what gets produced.

## [Creative Process Section]
Step-by-step approach

## [Technical Requirements / Constraints]
## [Output Format]
\`\`\`

---

## Writing rules (apply to all patterns)

- **Imperative voice**: "Check the total" not "The total should be checked"
- **Explain the WHY**: Reasoning beats bare commands for LLMs
- **Heading hierarchy**: \`##\` for sections, \`###\` for sub-sections — never use bold text as a fake heading
- **\`---\` separators**: Use between major independent sections (optional, for long skills)
- **Progressive disclosure**: Keep SKILL.md under ~300 lines. If the domain has deep reference content, write "Read \`references/foo.md\` for full details" rather than inlining everything
- **Tables for navigation**: Use \`| Task | Approach |\` tables when the skill has 3+ distinct sub-tasks or tools
- **No boilerplate "Examples" section**: Only add examples when they genuinely clarify something non-obvious
- **Keywords line**: Add \`**Keywords**: word, phrase, ...\` under Overview when the skill has non-obvious trigger vocabulary
- **NEVER / ALWAYS caps**: Reserve for truly critical constraints only — explain why, don't just command

Use all three inputs (intent, steps, constraints) but adapt structure to the domain. Do not mechanically dump every extracted field.`;


