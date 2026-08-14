# /ak:plan

## What it does

Turns a task into `specs/<slug>/plan.md`: a goal in one line, every file that will change, and a numbered list of checkbox steps. Then it waits for your approval before writing any code.

The plan lives on disk, not in the conversation. That is the whole difference between this and thinking out loud — a plan in a transcript dies with the session, and the next agent starts from nothing. A plan in `specs/` is picked up mid-flight, by you tomorrow or by a different tool entirely.

## When to reach for it

You invoke this by typing `/ak:plan <task>` — the agent won't reach for it on its own.

Reach for it when a task touches three or more files, needs new structure, changes a schema or an API, or has steps that depend on each other. Below that bar, planning costs more than it saves.

It plans a **change to code that already exists**. If you're starting a new feature or product from a vague idea, the skill will say so and point you at a spec-first flow instead — a one-file plan is the wrong artifact for something that doesn't have a shape yet.

## Prerequisites

Nothing to install, but it writes into `specs/<slug>/` in your working tree, and that directory is meant to be committed. Write the plan as something a teammate will read.

## Every step carries the command that proves it

This is the part that makes a plan more than a to-do list:

```markdown
- [ ] 2. Add refresh-token rotation to the auth service
      Verify: `npm test -- auth`
```

A step whose only proof is "I read it and it looks right" isn't a step — it gets folded into the one that produces something checkable.

And the ticking isn't done on trust. The kit ships a runner:

```bash
npx ai-workflow-kit verify <slug>            # next unchecked step
npx ai-workflow-kit verify <slug> --all      # until one fails
npx ai-workflow-kit verify <slug> --recheck  # re-run ticked steps
```

It runs each step's command and ticks the box **only** when it exits 0. So the file records what was demonstrated rather than what was claimed. `--recheck` is worth running before you call the task done: it catches step 6 having broken step 2, which a plan you only ever append to will never notice.

## Resuming, not overwriting

Point it at a task whose slug already exists and it reads what's there first:

| What it finds | What happens |
|---|---|
| `spec.md` | this feature is under the spec-first flow — it works the first unchecked task instead of writing a competing plan |
| only `plan.md` | it reports what's ticked and continues from the first unchecked step |
| nothing | it creates the directory |

## It's working if

- You can close the session mid-plan, come back, and the file tells you exactly where you were.
- Boxes get ticked by `verify`, not by hand.
- The **Not included in this plan** section has something real in it.
- You're asked at most one clarifying question before seeing the plan.

## Where it fits

The first chain step: `/ak:plan` → work → [`/ak:commit`](commit.md) → [`/ak:review`](review.md) → [`/ak:pr`](pr.md).

If a session ends mid-plan, [`/ak:handoff`](handoff.md) points the next agent at the plan file rather than re-listing its steps. If [`/ak:setup`](setup.md) has run, the `Verify:` commands come from the ones `.ak/config.md` recorded as actually existing in this repo.

[`/ak:help`](help.md) routes across the whole set when you're not sure which skill a task wants.
