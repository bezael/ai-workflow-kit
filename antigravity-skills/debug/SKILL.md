# Skill: debug

Structured debugging workflow. Diagnose before proposing fixes.

## Trigger

When the user writes `@debug [problem description]` or reports a bug, error, or unexpected behavior.

## Steps

### Phase 1: Reproduce and understand

1. Ask the user (if not provided):
   - What behavior were you expecting?
   - What behavior are you getting?
   - When did it start? Does it always happen or is it intermittent?

2. Read the files relevant to the error. If there's a stack trace, follow the trail from the error upward.

3. Find the exact point where behavior diverges from expected.

### Phase 2: Hypotheses

Before touching code, list the most likely causes:

```
Hypotheses:
1. [Most likely cause] — probability: high/medium/low
2. [Second cause] — probability: high/medium/low
3. [Third cause] — probability: high/medium/low
```

Always start with the highest-probability hypothesis.

### Phase 3: Verify

For each hypothesis, propose a minimal verification (a `console.log`, a test, checking a variable's value) before proposing a full fix.

### Phase 4: Fix

Only when the cause is confirmed:
1. Propose the minimal fix that solves the problem
2. Explain why it works
3. Point out if the fix can have side effects

### Phase 5: Prevention (optional)

If the bug reveals a problematic pattern, suggest how to prevent it in the future (test, validation, stricter type, etc.).

## Rules

- Don't propose fixes before understanding the cause. A fix without diagnosis is another bug waiting to appear.
- The simplest fix that solves the problem is the best fix.
- If the bug is in production, prioritize the quick fix (hotfix) and document the proper fix for later.
