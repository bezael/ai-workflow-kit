---
name: ak:debug
description: Structured debugging workflow — diagnose before proposing fixes. Use when user says /debug, reports a bug, an error, or unexpected behavior. Forms hypotheses before touching code.
argument-hint: "[problem description]"
---

# Skill: /ak:debug

Structured debugging. Build a **tight loop** before hypothesizing.

If `.ak/config.md` exists, read it first: the test command it records is the fastest route to a loop that can go red.

## Problem reported

$ARGUMENTS

## Redact

This skill has you show commands, their output, and captured artifacts. **Redact every secret before showing it** — write `<REDACTED>` in its place.

- Build loops against environment variables, so the credential stays in the environment and never in what you print.
- Captured artifacts — HAR files, request logs, headers, connection strings — carry auth tokens. Quote only the lines that carry the signal.
- If the redacted output isn't enough to diagnose the bug, say so and ask the user.

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

For an intermittent bug the goal isn't a clean repro but a **higher reproduction rate** — loop the trigger, add stress, inject sleeps. A 50% flake is debuggable; a 1% flake isn't.

### Phase 2: Minimise the repro

Run the loop and watch it go **red**. Confirm it produces the failure the *user* described, not a nearby one — wrong bug, wrong fix.

Then shrink it to the **smallest scenario that still goes red**. Cut inputs, callers, config, and steps **one at a time**, re-running the loop after each cut.

Done when every remaining element is load-bearing: removing any one of them turns the loop green.

Worth the minutes it costs — every element you cut is one fewer suspect in Phase 3, and the minimised repro is the regression test in Phase 5.

### Phase 3: Hypothesise

With the loop red and minimised, list **3-5 causes ranked by likelihood** before touching code. Stopping at one anchors you to the first plausible idea.

Each hypothesis must be **falsifiable** — state the prediction that would settle it:

```
Hypotheses:
1. [Most likely cause] — if this is it, [changing X] makes the bug disappear
2. [Second cause] — if this is it, [changing Y] makes it worse
3. [Third cause] — if this is it, [Z] already shows up in the logs
```

A hypothesis you can't state a prediction for is a vibe. Sharpen it or drop it.

Show the ranked list to the user before testing — they re-rank it instantly from domain knowledge ("we deployed a change to #2 yesterday"). Don't block on it if they're away.

### Phase 4: Verify

Test the predictions, **one variable at a time**, running the loop after each change:
- Targeted log at the boundary that distinguishes two hypotheses
- Swap a value, toggle a flag, or inline a function

A prediction that doesn't hold eliminates its hypothesis — say so and move down the list. The cause is confirmed when its prediction holds and the others' don't.

### Phase 5: Fix

Only when the cause is confirmed:
1. Write a regression test before the fix — turn the minimised repro from Phase 2 into a failing test, and watch it fail
2. Apply the minimal fix — the smallest change that makes the loop go **green**
3. Re-run the loop against the *original* scenario, not just the minimised one
4. Re-run the full test suite
5. Remove all `[DEBUG-id]` logs (grep the tag)

If there's no seam where the test can exercise the real bug pattern, **that absence is itself a finding** — note it rather than writing a shallow test that gives false confidence.

### Phase 6: Prevention (optional)

If the bug reveals a systemic gap, suggest how to close it:
- No clean test seam → flag for a review
- Type gap → stricter TypeScript
- Architectural issue → plan a refactor

State the hypothesis that turned out correct in the commit or PR message, so the next person debugging this area starts where you finished.

## Rules

- No Phase 3 without a tight, minimised loop. Theorizing before reproducing is the exact failure this skill prevents.
- The simplest fix that makes the loop green is the right fix.
- If in production: hotfix first, proper fix second — document the gap.
