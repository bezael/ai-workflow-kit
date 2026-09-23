# /ak-debug

## What it does

Runs a six-phase diagnosis on a bug: build a loop, minimise the repro, hypothesise, verify, fix, prevent. It refuses to theorise about a cause until it has a command that reproduces the failure.

The **tight loop** is the skill. Everything after Phase 1 is mechanical once you have a single command that goes red on *this* bug and green when it's fixed; without one, no amount of reading code will get you there. So the skill spends its effort at the front, and treats jumping straight to a hypothesis as the exact failure it exists to prevent.

## When to reach for it

Type `/ak-debug <what's wrong>`, or the agent reaches for it automatically when you report something broken, throwing, failing, or slow.

Reach for it on a bug you can't see the cause of. For a bug whose cause is obvious, this is overhead — just fix it. For problems in code nobody reviewed, [`/ak-vibe-audit`](vibe-audit.md) sweeps for whole classes of issue rather than chasing one.

## A loop that is tight, not just present

Four properties, all checked before Phase 2 is allowed to start:

- **Red-capable** — it runs the actual bug path and asserts your exact symptom. "Doesn't crash" isn't a signal.
- **Deterministic** — same verdict every run. For an intermittent bug the goal isn't a clean repro but a *higher reproduction rate*: a 50% flake is debuggable, a 1% flake isn't.
- **Fast** — seconds. A 30-second flaky loop is barely better than none; a 2-second deterministic one is a superpower.
- **Agent-runnable** — no human clicking in the middle.

Phase 1 is done when you can name that command and have run it at least once.

## Falsifiable, not probable

Phase 3 asks for three to five ranked causes, each with the prediction that would settle it:

```
1. Token expiry not being checked — if this is it, extending the TTL makes the bug disappear
2. Race between refresh and retry — if this is it, adding a delay makes it worse
```

A hypothesis you can't state a prediction for is a vibe. Sharpen it or drop it. Stopping at one cause anchors you to the first plausible idea, which is why the floor is three.

## Redaction is part of the job

The skill has you show commands, their output, and captured artifacts — and HAR files, request logs and connection strings carry credentials. Secrets get `<REDACTED>` before anything is shown, and loops are built against environment variables so the credential never enters what gets printed. If the redacted output isn't enough to diagnose the bug, it says so and asks you.

## It's working if

- The first thing you see is a command, not a theory.
- The repro shrinks before the hypotheses appear, and every element left in it is load-bearing.
- Every hypothesis comes with a prediction you could test.
- Debug logs are tagged `[DEBUG-id]` and grepped away at the end.
- When it can't build a loop, it says so and asks — rather than guessing on.

## Where it fits

A reach-for-it-anytime standalone. Where the fix reveals that there was no good seam to test at, it hands that finding on rather than swallowing it — which is usually a [`/ak-review`](review.md) or a [`/ak-plan`](plan.md) for a refactor.

If [`/ak-setup`](setup.md) has run, Phase 1 starts from the test command `.ak/config.md` recorded.

[`/ak-help`](help.md) routes across the whole set when you're not sure which skill a task wants.
