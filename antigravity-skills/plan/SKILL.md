---
name: plan
description: Plan a multi-file change into a resumable specs/<slug>/plan.md, and wait for approval before writing any code.
---

# Skill: @plan

Plan before executing, and leave the plan on disk so the next session — or the next agent — can pick it up where this one stopped.

If `.ak/config.md` exists, read it first: the commands it records are the ones a step's `Verify:` line should use, so a plan can't be verified against a test runner this repo doesn't have.

## Task to plan

the request the user typed

## Step 0: Decide where this belongs

1. **Derive a slug** from the task: short, kebab-case (`jwt-refresh`, `payment-retry`).

2. **Look for existing work** at `specs/<slug>/`:

| What you find | What to do |
|---|---|
| `spec.md` exists | This feature is already under the spec-first flow. **Read `spec.md` and `tasks.md` and work the first unchecked task.** Do not write a competing plan. |
| only `plan.md` exists | Resume it. Report what is already checked off, then continue from the first unchecked step. |
| nothing | Continue to Step 1 and create it. |

3. **Check the task is the right shape for this skill.** This skill plans a
   *change to code that already exists*. If the task is a new feature, module,
   or product starting from a vague idea, say so and recommend the spec-first
   flow (a full spec before any plan) instead — a one-file plan is the wrong
   artifact for that, and you would be skipping the spec.

## Steps

1. **Understand the goal**: Read the task. If ambiguous, ask ONE clarifying question before continuing.
   _Done when: the goal fits in one sentence._

2. **Explore the relevant codebase**:
   - Read files related to the task
   - Identify existing patterns (how something similar is already done)
   - Detect dependencies and risks
   _Done when: every file that will change has been read._

3. **Write `specs/<slug>/plan.md`** using this structure:

```markdown
# Plan: [task name]

Status: draft | approved | in progress | done
Updated: YYYY-MM-DD

## Goal
[One line describing what will be achieved]

## Files to be touched
- `path/file.ts` — [what change]
- `path/other.ts` — [what change]
- [new] `path/new.ts` — [what it does]

## Steps
- [ ] 1. [First concrete step]
      Verify: `[command that proves this step is done]`
- [ ] 2. [Second step]
      Verify: `[command]`
- [ ] 3. [...]

## Risks / decisions
- [Risk or trade-off the user should know about]
- [Alternative considered and why it wasn't chosen]

## Not included in this plan
- [What's out of scope and why]

## Notes
[Anything discovered mid-execution that changed the plan]
```

Every step needs a **Verify** line: the command that shows it is actually done
(`npm test -- auth`, `curl -s localhost:3000/health`, `tsc --noEmit`). A step
whose only proof is "I read it and it looks right" is not a step — fold it into
the one that produces something checkable.

4. **Show the plan and wait for approval** before executing any changes.
   _Done when: the user explicitly approves ("go ahead", "looks good", etc.)._
   Set `Status: approved` once they do.

5. **Mark the ticket InProgress**: if the task is linked to an issue or ticket, mark it as `in_progress` now — before writing any code.

6. **Execute** the plan in order. After each step:
   - Run its **Verify** command
   - Tick the checkbox in `plan.md` only when that command passes
   - If you discover something that changes the plan, stop, write it under **Notes**, and report

   The kit can do the running and ticking for you, which is stricter than doing
   it by hand — it will not tick a box whose command exited non-zero:

   ```bash
   npx ai-workflow-kit verify <slug>            # next unchecked step
   npx ai-workflow-kit verify <slug> --all      # until one fails
   npx ai-workflow-kit verify <slug> --recheck  # re-run ticked steps
   ```

7. **When every box is ticked**: set `Status: done`, then run the review skill on the changed files before considering the task complete.

   `--recheck` re-runs the commands behind steps already ticked. Worth doing
   before calling the task finished: it catches a later step having broken an
   earlier one, which a plan that is only ever appended to will never notice.

## Rules

- A plan is a contract. Execute exactly what was approved.
- Prefer small iterative plans over large complete ones.
- One clarifying question max — don't interview the user.
- `plan.md` is the source of truth for progress, not the conversation. Keep the
  checkboxes current as you go, so an interrupted session loses nothing.
- Never tick a box whose Verify command has not been run and passed.
- `specs/` is committed to the repo — write it as something a teammate will read.
