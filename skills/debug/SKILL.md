---
name: ak:debug
description: Structured debugging workflow — diagnose before proposing fixes. Use when user says /debug, reports a bug, an error, or unexpected behavior. Forms hypotheses before touching code.
argument-hint: [problem description]
---

# Skill: /debug

Structured debugging. Build a **tight loop** before hypothesizing.

## Problem reported

$ARGUMENTS

## Steps

### Phase 1: Build a feedback loop

Before reading code or forming theories, build a **tight loop** — one command that reproduces the bug and can go **red** on it.

If **Problem reported** is empty, ask the user: what were you expecting? what are you getting? is it intermittent?

Try in order:
1. **Failing test** at the nearest seam (unit, integration, e2e)
2. **Script / curl** against a running server with a fixture input
3. **Console probe** — one targeted log at the failure point, tagged `[DEBUG-id]`

The loop is tight when it is:
- [ ] **Red-capable** — runs the actual bug path and fails on *this* bug
- [ ] **Deterministic** — same result every run
- [ ] **Fast** — seconds, not minutes
- [ ] **Agent-runnable** — no human in the loop

**Phase 1 is done when you have named this command and run it at least once.**

Do not proceed to Phase 2 without a tight loop. Reading code to build a theory before this exists is the failure mode this skill prevents.

### Phase 2: Hypotheses

With the loop **red**, list the most likely causes before touching code:

```
Hypotheses:
1. [Most likely cause] — probability: high/medium/low
2. [Second cause] — probability: high/medium/low
3. [Third cause] — probability: high/medium/low
```

Show the list to the user before testing. They often re-rank instantly from domain knowledge.

### Phase 3: Verify

Change **one variable at a time** and run the loop after each change:
- Targeted log at the boundaries that distinguish hypotheses
- Swap a value, toggle a flag, or inline a function

The loop turns green when you've found the cause.

### Phase 4: Fix

Only when the cause is confirmed:
1. Write a regression test before the fix (if a clean seam exists)
2. Apply the minimal fix — the smallest change that makes the loop go **green**
3. Re-run the full test suite
4. Remove all `[DEBUG-id]` logs (grep the tag)

### Phase 5: Prevention (optional)

If the bug reveals a systemic gap, suggest how to close it:
- No clean test seam → flag for `/ak:review`
- Type gap → stricter TypeScript
- Architectural issue → `/ak:plan` a refactor

## Rules

- No Phase 2 without a tight loop. Theorizing before reproducing is the exact failure this skill prevents.
- The simplest fix that makes the loop green is the right fix.
- If in production: hotfix first, proper fix second — document the gap.
