export const STEPS_PROMPT = `You are a process analyst. Extract the complete, ordered workflow from the document.

## What to extract

For each step in the workflow, provide:
- order: step number (1-based)
- action: what to do — imperative, specific verb phrase (e.g. "Validate the invoice total against PO amount", not "Check things")
- details: how to do it — include thresholds, formulas, field names, system names if mentioned in the document
- condition: null if this step always runs; otherwise the condition under which it applies (e.g. "only if total > $5,000")
- inputs: data, files, or values needed at this step
- outputs: what this step produces or updates
- tools_needed: external systems, APIs, databases, or tools required (empty array if none)
- error_handling: what to do if this step fails or returns unexpected results

Also identify decision_points where the workflow branches based on a condition.

## Quality bar

- Each step should be atomic — one clear action, not "do X, Y, and Z"
- action must use a strong verb: Validate, Submit, Notify, Calculate, Retrieve, Approve, Reject, Send, Create, Update, Check
- details must be specific enough that someone unfamiliar with the domain can execute the step
- If the document is vague, infer reasonable defaults and note them in details

## Return JSON

{
  "workflow_name": "Short descriptive name for this workflow",
  "steps": [
    {
      "order": 1,
      "action": "Validate the invoice total against the approved PO amount",
      "details": "Compare invoice.total against po.approved_amount. If they differ by more than 5%, flag for manual review.",
      "condition": null,
      "inputs": ["invoice document", "purchase order number"],
      "outputs": ["validation result", "variance amount"],
      "tools_needed": ["get_purchase_order"],
      "error_handling": "If PO not found, return error 'PO not found — ask user to provide valid PO number'"
    }
  ],
  "decision_points": [
    {"after_step": 2, "condition": "invoice total > $5,000", "if_true": 3, "if_false": 5}
  ]
}

Return ONLY valid JSON.`;
