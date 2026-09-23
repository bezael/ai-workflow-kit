# /ak-execute

## What it does

Works a Spec-Driven Development feature one task at a time. Given `specs/<slug>/` with a `tasks.md` (written by an SDD tool such as [sdd-creator](https://github.com/bezael) — spec → plan → tasks), it picks the first unchecked task, shows you what it's about to do (task, criterion, files, Verify command), implements exactly that, and then hands the proof to the engine:

```bash
npx ai-workflow-kit verify <slug> --yes
```

The box gets ticked by the runner when the command exits 0 — never by the model deciding it's probably fine.

## The division of labor

This skill is deliberately not a spec tool. The boundary:

| SDD tool (sdd-creator) | AI Workflow Kit |
|---|---|
| Understand → Spec → Plan → Tasks | Task → Verify → Fix → Review → Final Verify → PR |
| Owns `spec.md`, `plan.md`, `tasks.md` content | Only ticks checkboxes, and only through verification |
| Traceability and lifecycle methodology | Execution engine, review, PR, hooks, guardrails |

When a task exposes a gap in the spec — a missing criterion, a contradiction — the skill **stops**. It does not improvise a decision in code; it tells you which spec section needs a reflow in the tool that owns it.

## When to reach for it

You invoke this by typing `/ak-execute <slug>` — the agent won't reach for it on its own.

Reach for it when a feature already has its `specs/<slug>/` directory generated and you want the task list worked through with proof at every step. If there is no spec yet, this is the wrong door: write the spec first, or use [`/ak-plan`](plan.md) for a lightweight change to existing code.

## One task, then stop

Default mode is human-in-the-loop: one task per invocation. `/ak-execute <slug> continue` chains tasks, but still halts at the first failing Verify, spec gap, or end of list — it never pushes through a red.

A failing Verify gets diagnosed and a minimal fix, **at most three times**. After that the skill stops with what it tried and what the output says. A loop that isn't converging needs you, not a fourth attempt.

## The Verify contract

A task is machine-checkable when it carries the same line `plan.md` steps use:

```markdown
- [ ] 🟢 **Implement vote toggle** — files: `src/votes/service.ts`. Criterion: `spec.md §3.2 AC-03`.
      Verify: `npm test -- votes`
```

One grammar for both flows — backticks mean "this is executable". A task without a `Verify:` line is reported as unverifiable; a manual-verification task (the no-TDD variant) is only ticked after you confirm you ran it.

## Finishing

When the last box is ticked:

```bash
npx ai-workflow-kit verify <slug> --final
```

re-runs every task's Verify (catching regressions) plus the Test / Lint / Typecheck / Build / E2E commands recorded in `.ak/config.md`. Only `Result: PASS` earns "done".

## Cross-tool notes

The skill body is fully portable: the same workflow ships for Claude Code and Codex (`/ak-execute`) and Antigravity (`@execute`). It leans on no Claude-specific features — no subagents, no forked context — because the engine doing the real work is the `npx ai-workflow-kit verify` CLI, which is identical everywhere.

## It's working if

- Every ticked box in `tasks.md` corresponds to a Verify command that actually exited 0.
- You saw the task, criterion, and command *before* any file changed.
- The diff at the end maps to the task's files — no drive-by refactors.
- A spec ambiguity produced a stop-and-report, not a guess.

## Where it fits

The SDD chain: spec tool writes `specs/<slug>/` → `/ak-execute` per task → [`/ak-review`](review.md) checks the diff against the spec → `verify --final` → [`/ak-pr`](pr.md) with traceability. [`/ak-setup`](setup.md) gives `--final` its global commands.
