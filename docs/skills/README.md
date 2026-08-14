# Skill docs

One page per skill. These are not the skills — a skill is a `SKILL.md` the agent reads; a page here is for the human deciding whether to reach for it.

Most of the set is **user-invoked**: the agent will never fire those for you, so you are the index that has to remember they exist. That memory is the cognitive load these pages exist to relieve. Each one orients you around a single skill: what it does, the constraint that makes it behave differently from the obvious default, when to reach for it, and how to tell it's working.

## Orientation

| Page | Reach for it when |
|---|---|
| [`/ak:help`](help.md) | you know the kit has something for this and can't remember which |
| [`/ak:setup`](setup.md) | once per repo — so the other skills stop guessing at your branch and commands |

## The git chain

| Page | Reach for it when |
|---|---|
| [`/ak:plan`](plan.md) | a task touches 3+ files, or has steps that depend on each other |
| [`/ak:commit`](commit.md) | you've staged a change and want the message written from the diff |
| [`/ak:review`](review.md) | before opening a PR, or on a file you've changed heavily |
| [`/ak:pr`](pr.md) | the branch is finished and pushed |

## Diagnosis

| Page | Reach for it when |
|---|---|
| [`/ak:debug`](debug.md) | something is broken and you can't see why |
| [`/ak:vibe-audit`](vibe-audit.md) | you've inherited or generated code nobody has reviewed |

## Continuity

| Page | Reach for it when |
|---|---|
| [`/ak:handoff`](handoff.md) | a session is ending with work unfinished |
| [`/ak:memory`](memory.md) | before starting in an unfamiliar area, or after a session that taught you something |

---

Writing or changing a skill? See [authoring-skills.md](../authoring-skills.md) for the spec fields, the `invocation` axis, and the build pipeline. Every skill needs a page here — `npm run build:check` fails if one is missing.
