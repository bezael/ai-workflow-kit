---
name: execute
description: Execute the next pending task of a specs/<slug>/ SDD feature — implement it, run its Verify command, and let the engine tick the box only on proof.
---

# Skill: @execute

Execute a Spec-Driven Development feature one proven task at a time. The spec
tooling (sdd-creator or equivalent) owns `spec.md`, `plan.md`, and `tasks.md`;
this skill only works the list: pick the next task, implement it, prove it with
its Verify command, and stop.

If `.ak/config.md` exists, read it first: it records the real test, lint, and
build commands, which is what a task's evidence should run against.

## Feature to execute

the slug (or feature) the user named, if any

## Step 0: Locate the feature

1. If a slug was given, use `specs/<slug>/`. If not, list `specs/*/tasks.md`
   and pick the one with pending tasks — **only when exactly one qualifies**.
   Several candidates: list them and ask which one. None: say so and stop;
   creating the spec is the SDD tool's job, not this skill's.
2. Read, in order: `spec.md` (the acceptance criteria), `plan.md` (the
   architecture and build order), `tasks.md` (the work list). A slug with
   `tasks.md` but no `spec.md` still works — the criteria are then whatever
   each task states inline.

## Step 1: Choose and announce the task

Take the **first unchecked task** in `tasks.md` — the order is the method, do
not cherry-pick. Before touching anything, show:

- **Task**: the checkbox line as written
- **Criterion**: the spec clause it satisfies (e.g. `spec.md §3.2 AC-03`)
- **Files**: the files it says it touches
- **Verify**: the command that will prove it, from its `` Verify: `cmd` `` line

If the task has no `Verify:` line, say it is not machine-checkable and what
command would make it so. A manual-verification task (the no-TDD variant, with
Given/When/Then) is only ever ticked after the user confirms they ran it.

## Step 2: Implement exactly that task

- Touch the task's files, plus whatever it clearly requires — nothing more.
  Adjacent improvements go unmade; that is what keeps the diff reviewable
  against the spec.
- Respect the TDD phase if the task carries one: a 🔴 test task must **fail**
  when first run — that failure is its proof; a 🟢 task adds no code its test
  doesn't require; a 🔵 refactor keeps every test green.

## Step 3: Verify — the engine ticks, not you

Run:

```bash
npx ai-workflow-kit verify <slug> --yes
```

It executes the task's Verify command and ticks the box only when the command
exits 0. Never mark `[x]` by hand — a box the engine didn't tick is a claim,
not a fact.

- **PASS** → report it, and stop (default mode). If the user asked to
  `continue`, move to the next task and repeat from Step 1.
- **FAIL** → diagnose from the command's real output, apply the **minimal**
  fix, and re-verify. **Three attempts maximum.** After the third failure,
  stop and report: what was tried, what the output says, and where the problem
  seems to live. A loop that isn't converging needs a human, not a fourth try.

## Step 4: When the spec has a gap

If implementing the task reveals something `spec.md` or `plan.md` doesn't
answer — a missing acceptance criterion, a contradiction, an undefined flow —
**stop immediately**:

1. Do not improvise a decision in code.
2. Leave the task unchecked and the working tree explainable (revert or note
   half-done work explicitly).
3. Report the gap precisely: which task, which question, which spec section
   should answer it.
4. Point at the fix: reflow the spec in the SDD tool that owns it, regenerate
   the affected tasks, then come back here.

## Step 5: When the list is done

When the last box is ticked, run the full check before calling the feature
complete:

```bash
npx ai-workflow-kit verify <slug> --final
```

It re-runs every task's Verify (catching regressions) plus the global Test /
Lint / Typecheck / Build / E2E commands from `.ak/config.md`. Only a `Result:
PASS` earns "done" — then suggest the review skill on the changed files, and
the PR skill after that.

## Rules

- One task per run is the default. `continue` mode chains tasks but still
  stops at the first failure, gap, or end of list — never push through a red.
- `tasks.md` is the source of truth for progress, not the conversation.
- Never rewrite spec/plan/tasks content; the SDD tool owns those files. The
  only change this workflow makes to them is a checkbox, via verification.
- Report verification results as they happened — a command that wasn't run is
  "not run", not "PASS".
- `specs/` can execute anything your shell can. On a repo you don't trust,
  read the Verify commands before running them.
