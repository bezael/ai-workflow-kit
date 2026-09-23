# /ak-commit

## What it does

Reads the staged diff and writes a Conventional Commits message for it. It classifies the change, drafts a subject line under 72 characters, and proposes it for you to approve before anything is committed.

It never writes from a guess. The diff is loaded into the skill before it starts, and the message has to describe what is actually in it — no "refactor authentication" over a change that only touched a config file. That constraint is the whole point: a message written from the conversation instead of the diff is confidently wrong, and stays wrong in the log forever.

## When to reach for it

You invoke this by typing `/ak-commit` — the agent won't reach for it on its own.

Reach for it once you have staged the change you want to record. If nothing is staged it falls back to the unstaged diff and tells you so, which is useful for drafting but means you're seeing a message for work that isn't committed yet.

For the message that goes on a *branch* rather than a commit, use [`/ak-pr`](pr.md).

## The diff is the evidence

Everything the skill does is downstream of one thing: `git diff --staged` is loaded before the model starts thinking. So the review it can give you is a real one.

- Sees a secret or a `.env` in the staged set → it refuses and warns rather than committing.
- Sees a diff that mixes concerns → it suggests splitting rather than writing a message vague enough to cover both.

Both are only possible because the diff is there. A commit skill that asks you what you changed can do neither.

## It's working if

- The message names files or behaviour you recognise from the diff, not a generic summary of the ticket.
- A mixed-concern diff gets pushed back on instead of getting a message with an "and" in it.
- The type is right often enough that you stop checking it — `fix:` for a bug, `chore:` for a lockfile bump.
- You are asked before the commit runs, every time.

## Where it fits

A reach-for-it-anytime standalone, and the last step of most other flows: [`/ak-plan`](plan.md) → work → `/ak-commit` → [`/ak-pr`](pr.md).

If [`/ak-setup`](setup.md) has run, the commit convention and the language of the message come from `.ak/config.md` instead of the defaults.

[`/ak-help`](help.md) routes across the whole set when you're not sure which skill a task wants.
