# /ak:setup

## What it does

Works out how this repo actually does things — default branch, git host, test and lint commands, commit convention, layout — and records it in `.ak/config.md` for the other skills to read.

It detects before it asks. Every question it puts to you is one the repo has already answered somewhere, so it reads the lockfile, the `package.json` scripts, the git remote and the last thirty commit subjects first, and only then asks about what's genuinely left — in one batched round, not an interview.

## When to reach for it

You invoke this by typing `/ak:setup` — the agent won't reach for it on its own.

Run it once per repo, right after installing the kit. Run it again when something structural changes: a new test runner, a move from GitHub to GitLab, a switch of default branch.

## Prerequisites

A git repository. It writes `.ak/config.md`, which is meant to be committed — so it never records a secret, token, or connection string.

## Unknown beats plausible

The rule that shapes the output: a command that doesn't run is worse than no command, because the skill reading it will fail confidently.

- A `package.json` script exists → record it.
- A binary is claimed → check it resolves.
- Nothing verifiable → record `unknown`, and say why.

It won't *run* your test suite to check — confirming the script is defined is the boundary. And it won't write a plausible default: `npm test` on a repo that has no test script is exactly the failure this prevents.

An existing `.ak/config.md` is read and updated, never overwritten. If you hand-edited a line, your edit outranks the detection.

## What reads it

| Skill | What it takes from the config |
|---|---|
| [`/ak:commit`](commit.md) | commit convention, message language |
| [`/ak:pr`](pr.md) | base branch, git host, whether `gh` is available |
| [`/ak:plan`](plan.md) | the commands a step's `Verify:` line should use |
| [`/ak:execute`](execute.md) | the real commands a task's evidence runs against |
| [`/ak:review`](review.md) | base branch to diff against; lint and typecheck commands |
| [`/ak:debug`](debug.md) | the test command, as the fastest route to a red loop |
| `verify --final` | the `Test` / `Lint` / `Typecheck` / `Build` / `E2E` entries under `## Commands`, executed as the global checks |

Each of those falls back to a sensible default without the file. The defaults are right often enough to be dangerous and wrong often enough to matter, which is the argument for running this once.

The last row is the one that makes `## Commands` a contract rather than prose: `npx ai-workflow-kit verify <slug> --final` executes those entries directly, skipping any marked `unknown`. What the file records is what the harness runs.

## It's working if

- It runs detection commands before it asks you anything.
- The questions it does ask are ones you'd have had to answer.
- Some fields say `unknown` — that's honesty, and it tells you what to fill in by hand.
- Re-running it doesn't clobber a line you edited.
- `.ak/config.md` is short. Nothing is in it that no skill reads.

## Where it fits

A run-once setup, the other half of orientation alongside [`/ak:help`](help.md): that one tells you which skill to use, this one tells the skills how this repo works.

Nothing depends on it — every skill works without it — but every skill that touches git, tests, or conventions works better with it.
