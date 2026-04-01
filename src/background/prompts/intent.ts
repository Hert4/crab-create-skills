export const INTENT_PROMPT = `You are a business analyst. Analyze the document and determine what Agent Skill should be created from it.

Return JSON with exactly these fields:

{
  "skill_name": "kebab-case-name",
  "skill_type": "capability" | "preference",
  "description": "<see rules below>",
  "target_user": "<who uses this — role or persona, e.g. 'finance team', 'customer support agent', 'developer'>",
  "domain": "<domain tag — use one of: finance, legal, hr, sales, support, data-analytics, engineering, marketing, operations, education, healthcare, logistics, creative, general>"
}

## skill_name rules
- If the document describes a single workflow or tool → name it after that workflow
- If the document describes an agent or system with MULTIPLE skills/capabilities → name it after the agent/system as a whole (e.g. "customer-support-agent", "finance-assistant")
- Use kebab-case, be specific, avoid generic names like "agent-skill"

## skill_type rules
- "capability": the skill teaches the agent HOW to do something (process invoices, analyze data, generate reports)
- "preference": the skill stores user preferences or personal style (writing tone, formatting rules, personal workflows)

## description rules
This field is the ONLY thing Claude reads to decide whether to invoke the skill. Write it to maximize correct triggering.

Structure it in 3 parts:
1. One sentence: what the skill does and the domain it covers
2. "Use this skill when:" followed by a specific list of trigger phrases, file types, and contexts
3. (Optional) "Do NOT use for:" — only add this if there's a realistic false-positive risk

Length: 2-4 sentences. Specific over generic. Err toward over-triggering.

Good description example:
"Processes customer support tickets following the company escalation policy. Use this skill when the user wants to handle a complaint, create a support ticket, escalate an issue to a manager, check ticket status, or resolve a customer problem — even if they don't say 'ticket' explicitly."

Bad description example:
"Helps with customer service tasks. Use when needed."

## domain field
Pick the single closest tag from this list: finance, legal, hr, sales, support, data-analytics, engineering, marketing, operations, education, healthcare, logistics, creative, general

Return ONLY valid JSON.`;

