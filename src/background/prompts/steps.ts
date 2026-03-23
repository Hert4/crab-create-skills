export const STEPS_PROMPT = `You are a process analyst AI.

Extract the complete workflow as ordered steps.

For each step provide:
- order: Step number
- action: What to do (imperative form)
- details: How to do it
- condition: null if always, otherwise when this step applies
- inputs: Data/files needed
- outputs: What this step produces
- tools_needed: Tools/APIs if any
- error_handling: What to do if this fails

Also identify decision_points where the flow branches.

Return JSON:
{
  "workflow_name": "...",
  "steps": [...],
  "decision_points": [
    {"after_step": 2, "condition": "...", "if_true": 3, "if_false": 5}
  ]
}

Return ONLY valid JSON.`;
