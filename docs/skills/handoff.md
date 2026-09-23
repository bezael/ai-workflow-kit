# /ak-handoff

## What it does

Compacts the current conversation into a single document a fresh agent can start from: where you left off, what's still open, what was decided, which artifacts to read first, and what to do next.

It references rather than duplicates. Anything already written down — a `specs/<slug>/plan.md`, a PRD, an ADR, an issue, a commit — is named by path or URL, never copied in. A handoff that restates a plan's checkboxes creates a second copy of the truth, and the two disagree the moment either one is edited.

## When to reach for it

You invoke this by typing `/ak-handoff [focus of the next session]` — the agent won't reach for it on its own.

Reach for it when a session is ending with work unfinished: you're out of time, the context window is filling, or someone else is picking it up. If the work is mid-plan, this document points at the plan; [`/ak-plan`](plan.md) is where the step-by-step progress actually lives.

## Prerequisites

None to install. It writes to the OS temp directory — `%TEMP%\handoff-<timestamp>.md` on Windows, `/tmp/handoff-<timestamp>.md` elsewhere — and reports the path. Deliberately not into your workspace: a handoff is session scratch, not a project artifact, and a `handoff-*.md` sitting in the repo three weeks later is a lie about the current state.

## Self-contained, but not a transcript

The bar is that a fresh agent reading **only this file** knows where to start. That means the document has to carry the things that aren't anywhere else:

- **Open threads** — decisions not made, and what's blocking each.
- **Key decisions this session** — one line each, with the why.
- **Context the next agent needs but isn't in the code** — constraints, preferences, things tried and abandoned. This section is the one that justifies the document; everything else could be reconstructed.

Secrets and PII are redacted on the way out.

## It's working if

- The artifact list is links and paths, not pasted content.
- A mid-flight plan is named with "N of M steps done, next: step N+1" and nothing more.
- **Suggested next steps** opens with something concrete enough to act on immediately.
- A new session started from the file alone doesn't ask you to re-explain the project.

## Where it fits

A reach-for-it-anytime standalone that closes a session rather than opening one. Its most common companion is [`/ak-plan`](plan.md) — the plan holds progress, the handoff holds everything around the plan.

[`/ak-memory`](memory.md) is the other half of continuity, and the split is worth knowing: a handoff is *this* work, right now, disposable. Memory is what stays true across sessions.

[`/ak-help`](help.md) routes across the whole set when you're not sure which skill a task wants.
