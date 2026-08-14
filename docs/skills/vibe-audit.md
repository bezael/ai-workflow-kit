# /ak:vibe-audit

## What it does

Sweeps an AI-generated app for the problems that accumulate when code ships without anyone reading it: hardcoded secrets, open CORS, unauthenticated admin routes, plain-text passwords, IDOR, JWTs with no expiry, stack traces leaking to clients, XSS, missing rate limits. It reports each with the file, the line, the risk, and a fix — then an ordered action plan.

It checks a fixed list of twenty risk patterns, loaded before the audit starts. That's the difference between this and asking an agent to "look for problems": a fixed list is exhaustive in one direction, so the absence of a finding means something. An open-ended read finds whatever the model happened to notice.

## When to reach for it

You invoke this by typing `/ak:vibe-audit`, optionally with a folder to scope it — the agent won't reach for it on its own.

Reach for it when you've inherited or generated a codebase nobody has reviewed, and you want to know how bad it is before shipping. For a focused read of code you wrote deliberately, [`/ak:review`](review.md) is the sharper tool; for one specific misbehaviour, [`/ak:debug`](debug.md).

## Nothing is reported that isn't in the code

Every finding carries the file, the line, and the offending snippet. An audit that lists plausible risks rather than present ones is worse than no audit — it buries the four real problems in twenty theoretical ones, and the reader stops trusting the list.

The report is grouped Critical / Important / Improvements with a count per group, and ends with an ordered action plan, most urgent first. The ordering is the deliverable: a flat list of thirty problems doesn't tell you what to do on Monday morning.

## It's working if

- You can click through to every finding.
- The Critical count is small and each one is genuinely a security or production risk.
- The action plan's first item is the one you'd have picked yourself.
- It also names what the code does *well* — an audit that finds nothing good in a working app is not reading carefully.

## Where it fits

A reach-for-it-anytime standalone, usually the first thing you run on unfamiliar code. What it finds normally becomes a [`/ak:plan`](plan.md) — the audit tells you what's wrong, the plan sequences the fixing and proves each step.

Its pattern list lives in `patterns.md` next to the skill (Claude Code and Antigravity) or in `~/.codex/ak-workflow-kit/vibe-audit-patterns.md` (Codex) — Codex prompts are flat files, so an asset beside one would register as a phantom slash command.

[`/ak:help`](help.md) routes across the whole set when you're not sure which skill a task wants.
