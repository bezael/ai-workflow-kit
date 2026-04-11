# Memory Index

This file is the entry point for all persistent memory. Load it at the start of each session.
Each entry points to a specific memory file — read the relevant ones based on the current task.

## Active memories

- [Project](project.md) — Architecture decisions, stack, conventions, business context
- [Feedback](feedback.md) — What worked, what to avoid, team preferences
- [User](user.md) — Team roles, expertise, communication style preferences
- [Decisions](decisions/) — Individual ADRs and one-off decisions (one file per decision)

## How to use this index

- Before starting any non-trivial task: read `project.md` and `feedback.md`
- Before making architecture decisions: check `decisions/` for prior art
- After a session with significant learnings: run `/ak:memory save` to persist them
- If a memory seems outdated: run `/ak:memory clean` to remove or update it

## Memory principles

1. **Short and specific** — one fact per entry, not summaries of conversations
2. **Dated** — always include the date a decision was made (YYYY-MM-DD)
3. **Actionable** — if it doesn't change how you act, it doesn't belong here
4. **Maintained** — stale memories are worse than no memories
