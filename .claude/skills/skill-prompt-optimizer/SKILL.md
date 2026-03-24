---
name: skill-prompt-optimizer
description: This skill should be used when the user asks to "optimize a skill", "improve a SKILL.md", "make this prompt better", "optimize prompt", "rewrite skill description", "improve trigger phrases", "the skill isn't triggering correctly", "Claude isn't using my skill", "improve skill quality", "polish this skill", "tối ưu skill", "cải thiện SKILL.md", "optimize prompt cho skill", "sửa description skill", or when a SKILL.md file needs quality improvements. Also triggers when the user pastes a SKILL.md and asks for improvements.
version: 1.0.0
---

# Skill Prompt Optimizer

Analyze and optimize SKILL.md files for better triggering, clarity, and execution quality.

## What This Skill Optimizes

A SKILL.md has two parts with different optimization goals:

| Part | Location | Goal |
|------|----------|------|
| `description` (frontmatter) | YAML header | **Trigger coverage** — Claude activates the skill at the right times |
| Body instructions | Markdown below frontmatter | **Execution quality** — Claude follows the skill correctly when activated |

Both require separate attention.

## Workflow

### Step 1: Identify the Skill to Optimize

If the user didn't specify which file:

```bash
find . -name "SKILL.md" | head -20
```

Ask which file if multiple exist. Read the target file in full before proceeding.

### Step 2: Analyze Current Quality

Evaluate against these criteria and note specific issues:

**Frontmatter description:**
- [ ] Uses third-person format ("This skill should be used when...")
- [ ] Contains specific trigger phrases users would actually say (not abstract categories)
- [ ] Covers multiple phrasings of the same intent
- [ ] Includes non-English variants if users are multilingual
- [ ] Not too narrow (would miss real use cases) or too broad (would false-trigger)
- [ ] Lists both explicit requests ("create invoice") and implicit contexts ("customer just paid")

**Body instructions:**
- [ ] Written in imperative form ("Check the amount" not "The amount should be checked")
- [ ] Each instruction is atomic (one action per step)
- [ ] Rules include "why" reasoning, not just "always/never" dictates
- [ ] Examples are realistic and cover edge cases, not just happy paths
- [ ] Output formats shown as templates, not abstract descriptions
- [ ] Edge cases and error handling are explicit
- [ ] No redundant or contradictory instructions
- [ ] Total length under 500 lines (or under 2,000 words for plugin skills)

### Step 3: Present the Analysis

Output a clear quality report before making changes:

```
## SKILL.md Quality Report: [skill-name]

### Overall Assessment
Score: X/10
Key issues: [list top 3 problems]

### Description (Trigger) Analysis
- Coverage: [Good/Needs work]
- Specificity: [Good/Needs work]
Issues found:
- [specific issue 1]
- [specific issue 2]

### Body (Instructions) Analysis
Issues found:
- [specific issue 1]
- [specific issue 2]

### Recommended Changes
1. [change 1 — with reason]
2. [change 2 — with reason]
```

### Step 4: Apply Optimizations

After confirming with the user, apply these optimizations:

#### Description optimization

Rewrite the description field to:
- Cover ALL user phrasings that should trigger this skill
- Use concrete phrases (quotes around specific user phrases help)
- Include role/context signals ("when user is a developer", "when working with financial data")
- Be "pushy" — err toward broad coverage rather than narrow precision

**Pattern:**
```yaml
description: This skill should be used when the user asks to "[phrase 1]", "[phrase 2]", "[phrase 3]", or when [context/situation description]. Also use when [additional trigger context].
```

#### Instruction clarity optimization

For each instruction in the body:

1. **Convert passive → imperative**: "The order should be validated" → "Validate the order amount"
2. **Add reasoning to bare rules**: "ALWAYS confirm before sending" → "Confirm before sending — users often catch mistakes at this stage, especially for amounts and recipients"
3. **Split compound steps**: "Check and validate the form, then submit" → two separate steps
4. **Add specificity**: "Format the date correctly" → "Format dates as YYYY-MM-DD"
5. **Show templates for output formats** instead of describing them abstractly

#### Examples optimization

Ensure examples:
- Cover at least one edge case or unusual scenario (not just the happy path)
- Show full context → action → output flow
- Are realistic (based on actual user scenarios, not toy examples)
- Demonstrate the key branching logic if the skill has conditional paths

### Step 5: Verify the Optimized Version

After applying changes, check:

- [ ] Frontmatter YAML is valid (no broken syntax)
- [ ] Description length is reasonable (typically 1-3 sentences)
- [ ] All referenced files exist (if skill references `references/` or `examples/`)
- [ ] No code fences wrapping the frontmatter
- [ ] Instructions remain accurate to the original intent
- [ ] Total length still under limit

## Common Optimization Patterns

### Weak → Strong Description

❌ **Weak:**
```yaml
description: Helps with invoice creation.
```
✅ **Strong:**
```yaml
description: This skill should be used when the user asks to "create an invoice", "generate invoice", "bill a customer", "make invoice for [client]", or when completing an order that needs billing. Also use when user says "invoice ready" or asks to send payment details.
```

### Passive → Imperative Instructions

❌ **Passive:**
```markdown
The customer's name should be extracted from the request.
Validation of the amount is required before proceeding.
```
✅ **Imperative:**
```markdown
Extract the customer name from the request.
Validate the amount before proceeding — reject if negative or zero.
```

### Rule-only → Reasoned Instruction

❌ **Rule-only:**
```markdown
ALWAYS double-check the recipient before sending.
NEVER skip the confirmation step.
```
✅ **Reasoned:**
```markdown
Double-check the recipient before sending — wrong-recipient errors are the most common mistake in this workflow and are hard to undo.
Include a confirmation step — users frequently catch typos in amounts and dates at this stage.
```

### Abstract format → Concrete template

❌ **Abstract:**
```markdown
Format the summary in a structured way with all required fields.
```
✅ **Template:**
```markdown
Format the summary as:
**Customer:** [name]
**Amount:** [amount] [currency]
**Due date:** [YYYY-MM-DD]
**Status:** [Pending / Paid / Overdue]
```

## Trigger Phrase Strategy

When writing trigger phrases, include these categories:

1. **Direct action phrases**: "create X", "generate X", "make X", "build X"
2. **Task/domain phrases**: "I need to invoice", "for billing purposes", "send to client"
3. **Problem phrases**: "invoice isn't working", "can't figure out the billing", "help with payment"
4. **Status phrases**: "order is complete", "payment received", "customer approved"
5. **Implicit context**: "just closed the deal", "customer ready to pay"
6. **Non-English variants** (if applicable): Vietnamese, French, etc.

## When NOT to Over-Optimize

Avoid making a description so broad it triggers on unrelated queries. If the skill is for "invoice creation", it should NOT trigger on:
- General accounting questions
- Tax advice
- Payment processing integrations

Keep the description focused on the actual task the skill handles.

## Output Format

When presenting the optimized SKILL.md to the user:
1. Show the diff view (what changed) for review
2. Then write the complete optimized file
3. Explain the top 3 most impactful changes made

Use the Edit tool to apply changes directly to the file after user approval.
