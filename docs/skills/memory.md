# /ak:memory

## What it does

Three subcommands over a `memory/` directory: `save` persists what a session taught, `recall` surfaces what's relevant before you start, `clean` prunes what's gone stale.

It filters ruthlessly on the way in. Anything derivable from reading the code or the git history does not get saved — that isn't memory, it's a stale duplicate of something already true elsewhere. What earns a place is the non-obvious: a decision and its reasoning, an approach that worked, an anti-pattern the team hit once already.

## When to reach for it

Type `/ak:memory save`, `/ak:memory recall <question>`, or `/ak:memory clean`. The agent can also reach for it — recalling before acting, or offering to save when a session produces something worth keeping.

Reach for `recall` at the start of anything non-trivial in an unfamiliar area, and `save` at the end of a session that changed how you'd do something. Bare `/ak:memory` shows the three options and asks.

## Prerequisites

A `memory/` directory in the repo. The kit's layout:

| File | Holds |
|---|---|
| `memory/MEMORY.md` | the index — start here |
| `memory/project.md` | architecture decisions, stack, business context |
| `memory/feedback.md` | what to repeat, what to avoid, team preferences |
| `memory/user.md` | team roles, expertise, communication style |
| `memory/decisions/` | one ADR per file |
| `memory/CHANGELOG.md` | an entry for every write, with the reason |

## Saying "nothing" is a valid answer

Two places where the skill's value is in what it *doesn't* do:

- **`recall` with no relevant memory** says so plainly rather than assembling plausible-sounding context. Invented memory is worse than none, because you'll act on it.
- **`clean` flags rather than deletes** anything it isn't sure about. A wrong deletion is silent and permanent; a flag costs you ten seconds.

Every write is logged to `memory/CHANGELOG.md` with the reason it was worth persisting — which is also how you audit whether the filter is working.

## It's working if

- `save` regularly declines things, and tells you why.
- `recall` comes back empty sometimes.
- `memory/project.md` doesn't contain anything you could learn by reading `src/`.
- The changelog's **Why** lines still read as good reasons a month later.
- No credential, token, or personal detail ever lands in a memory file.

## Where it fits

A reach-for-it-anytime standalone that brackets the others — `recall` before, `save` after.

The line against [`/ak:handoff`](handoff.md): a handoff is *this* piece of work right now, written to temp, thrown away when it's picked up. Memory is what stays true across sessions and lives in the repo.

[`/ak:help`](help.md) routes across the whole set when you're not sure which skill a task wants.
