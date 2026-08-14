# Authoring a skill

## One source, three distributions

A skill has exactly one hand-written file: `src/skills/<id>.md`. It is YAML frontmatter — the spec — plus a portable markdown body. `scripts/build-skills.js` renders it into every distribution:

| Distribution | Path | Invoked as |
|---|---|---|
| Claude Code | `skills/<id>/SKILL.md` | `/ak:<id>` |
| Google Antigravity | `antigravity-skills/<id>/SKILL.md` | `@<id>` |
| OpenAI Codex | `codex-prompts/ak-<id>.md` | `/ak-<id>` |

The generated files are committed, because the installers read them directly. **Never hand-edit one** — `npm run build:check` re-renders and fails on any drift, and it runs in CI ahead of the tests. Edit the source, then `npm run build`.

## The `invocation` axis

Every spec declares `invocation`, and it is the one axis that splits the set:

| | `user` | `model` |
|---|---|---|
| Who can reach it | only the human typing its name | model or human |
| Claude Code frontmatter | `disable-model-invocation: true`, derived by the builder | nothing |
| Who the `description` is for | **a human** browsing slash commands | **the model** deciding whether to fire |

The test for `model`: *could the model usefully reach for this on its own?* Reuse is a reason to extract a skill, not a reason to make it model-invoked.

That choice decides how the `description` is written, and the schema enforces it both ways:

- **`invocation: user`** — one line, plain, no triggers. Trigger phrasing ("Use when the user says /commit…") is dead weight: nothing but the human can ever fire the skill, and the string is shown to a person scanning a command list.
- **`invocation: model`** — keep the rich triggers ("Use when the user says…, mentions…, asks for…"). Without them the harness has nothing to match on, so the skill silently never fires.

`validateSpec` in `scripts/lib/spec.js` rejects a user-invoked description that carries triggers, a model-invoked one that lacks them, and any hand-written `disable-model-invocation` in `targets.claude.frontmatter` — that flag is derived from `invocation` so the two can never disagree. `evals/cli/spec.test.js` covers the rules.

Only Claude Code has a flag for this. Antigravity has no equivalent, and Codex prompts are flat files the human types, so they are user-invoked by construction.

## Lifecycle: `status`

Optional. Omit it and the skill is `stable`.

| `status` | What it means | What the build does |
|---|---|---|
| `stable` | finished, safe to rely on | nothing |
| `experimental` | shipped, still being shaped | banner under the H1; the CLI warns before installing it |
| `deprecated` | still runs, on the way out | banner naming the replacement; the CLI warns and points at it |

`deprecated` requires `replaced_by: <skill id>`, and the builder renders it in each target's own invocation style — `/ak:plan` for Claude Code, `@plan` for Antigravity, `/ak-plan` for Codex. A deprecation with nowhere to send people fails the schema.

The point is to be able to ship something unfinished, and to retire something, **visibly** — the failure this replaces is a skill that is quietly one or the other. Prefer `experimental` over holding a skill back: a labelled rough edge beats an unshipped one.

`src/manifest.json` is generated alongside the distributions and carries each skill's id, status, invocation and description. `bin/cli.js` reads it to label the listing; it ships with no dependencies and cannot parse YAML.

## Contract and acceptance

`contract` states what the skill must produce regardless of which tool runs it. `acceptance` is the executable form of the same thing — `evals/skills/<id>.eval.js` reads it through `resolveAcceptance()`, so the criteria have one home rather than a copy per eval.

A skill may declare `acceptance.criteria` before anyone has built a fixture to run them against. It then needs `acceptance.pending: <reason>` **and** an entry in `src/eval-coverage.json`, or the coverage ratchet in `npm run build:check` fails. The ratchet fails in both directions: writing the fixture forces you to delete the entry, which is what stops the allowlist rotting into a permanent excuse.

## Install commands and the skill tables

The install commands are generated too. [`src/install-block.md`](../src/install-block.md) is the one copy; `scripts/sync-docs.js` injects it into the `<!-- ak:block … -->` regions of `README.md` and `README.es.md`, filling in the version, the command list (from `src/manifest.json`), and the hook count. Editing a marked region by hand fails `build:check`.

The same script lints what it can't generate:

- Every CLI flag the docs attach to an `npx ai-workflow-kit` invocation is one `bin/cli.js` actually accepts.
- The `--flag` set matches across languages.
- Any doc carrying a skill-table marker on its own line mentions every non-deprecated skill — the tables have a translated prose column so they stay hand-written, but they can't silently fall behind a new skill.
- Every skill has a page in [`docs/skills/`](skills/README.md), and the index links it.

## The docs page

Every skill needs `docs/skills/<id>.md`. It is not the skill and not a copy of `SKILL.md` — a `SKILL.md` tells the agent how to do the job, a docs page tells a human whether to reach for it at all. Most of the set is user-invoked, which means the human *is* the index; the page is what makes that index rememberable.

Keep the frame:

| Section | Carries |
|---|---|
| `## What it does` | the one-sentence job, then the **defining constraint** — the fact that makes this skill behave differently from the obvious default. Plain prose, never a labelled aside. |
| `## When to reach for it` | invocation mode (typed vs. model-fired), and the boundary against the sibling it's confusable with |
| `## Prerequisites` | only where one exists — a workspace it writes into, tooling it needs. Omit the heading otherwise. |
| free-form middle | one to three sections in the skill's own vocabulary, surfacing its leading word — *tight loop*, *seam*, *Verify command* |
| `## It's working if` | signals the reader can check without opening `SKILL.md` |
| `## Where it fits` | its role (chain step, run-once setup, standalone), its neighbours, and a pointer to `/ak:help` |

Explain the why, not the runbook. A human choosing a tool does not need the steps.

## Before opening a PR

```bash
npm run build      # re-render the distributions
npm test           # build:check + hook and CLI tests
npm run eval       # LLM-graded acceptance cases (costs tokens)
```

## Rejecting a feature

A decision *not* to build something goes in [`.out-of-scope/`](../.out-of-scope/README.md), one file per decision, with the reasoning and the request that prompted it. See that README for when to write one.
