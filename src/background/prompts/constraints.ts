export const CONSTRAINTS_PROMPT = `You are a compliance analyst AI.

Mine ALL business rules, constraints, and edge cases from this document.

Return JSON:
{
  "hard_rules": [{"rule": "...", "source": "where in document"}],
  "soft_rules": [{"rule": "...", "source": "..."}],
  "edge_cases": [{"case_name": "...", "handling": "...", "source": "..."}],
  "exceptions": [{"exception": "...", "when": "...", "source": "..."}],
  "validations": [{"field": "...", "check": "...", "source": "..."}],
  "permissions": [{"action": "...", "who": "...", "source": "..."}]
}

Find everything: absolute rules (MUST/NEVER), guidelines, special cases, permissions.
Return ONLY valid JSON.`;
