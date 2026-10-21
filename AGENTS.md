# AGENTS.md — AI Workflow Kit

## What this repo is

A collection of skills, agents, and memory patterns to make working with AI coding tools faster and more consistent.
Works with: **Claude Code**, **Cursor**, **GitHub Copilot**, **Google Antigravity**, **OpenAI Codex**, **Pi**.

For Codex the same skills ship as flat slash commands in `codex-prompts/`, under the same names as in Claude Code (`/ak-commit`) — install them with `npx ai-workflow-kit --codex`.

For Pi the repo is a Pi package (`"pi"` key in `package.json`): `pi/skills/` holds the skills plus the five agents as skills (Pi has no subagents), invoked as `/skill:ak-<name>`, and `pi/extensions/ak-hooks.ts` runs `hooks/*.sh` on Pi's tool events. Install it with `pi install npm:ai-workflow-kit`.

**Every skill is generated.** The one hand-written file is `src/skills/<id>.md`; `skills/`, `antigravity-skills/`, `codex-prompts/`, and `pi/skills/` are rendered from it by `npm run build` (`pi/skills/` also gets the agents from `agents/<name>/AGENT.md`). Editing a generated file fails `npm run build:check` in CI. See [docs/authoring-skills.md](docs/authoring-skills.md) for the spec fields, the `invocation` axis, and the eval-coverage ratchet.

### Where each tool reads skills from

| Tool | Global | Project |
|------|--------|---------|
| Claude Code | `~/.claude/skills/<name>/SKILL.md` | `.claude/skills/` |
| Antigravity | `~/.gemini/config/skills/<name>/SKILL.md` | `.agents/skills/` |
| Codex | `~/.codex/prompts/<name>.md` (flat, no dirs) | — |
| Pi | the package's `pi/skills/` via `~/.pi/agent/settings.json` | `.pi/settings.json` (`pi install -l`) |

Antigravity's global root moved from `~/.gemini/antigravity/` to `~/.gemini/config/`; the old path only still works on installs that migrated in place, via a compatibility symlink. Don't write to it. Rules for Antigravity are `GEMINI.md`, `AGENTS.md`, and `.agents/rules/*.md`.

## Available Skills

<!-- ak:skill-table -->

| Command                      | Description                                         |
|------------------------------|-----------------------------------------------------|
| `/ak-help [task]`            | Points at the one skill that fits the task at hand  |
| `/ak-setup`                  | Records the repo's branch, commands, and conventions in `.ak/config.md` |
| `/ak-commit`                 | Generates commit message with real diff context     |
| `/ak-pr`                     | Creates PR with description, test plan, and checklist |
| `/ak-review`                 | Reviews code or PR with configurable criteria       |
| `/ak-plan`                   | Plans before executing, into a resumable `specs/<slug>/plan.md` |
| `/ak-execute [slug]`         | Executes the next pending SDD task from `specs/<slug>/tasks.md`, verified |
| `npx ai-workflow-kit verify` | Runs a plan's or task list's Verify commands, ticks only what passes; `--final` adds the global checks from `.ak/config.md` |
| `/ak-debug`                  | Structured debugging workflow                       |
| `/ak-vibe-audit`             | Audit of apps generated with vibe coding            |
| `/ak-handoff [focus]`        | Compact the conversation for a fresh agent to continue |
| `/ak-memory save [topic]`    | Persist learnings from the current session          |
| `/ak-memory recall [question]` | Retrieve relevant memory before acting            |
| `/ak-memory clean`           | Remove or update stale memories                     |

## Specialized Agents

| Agent           | When to use                                         |
|-----------------|-----------------------------------------------------|
| `/ak-frontend`  | Create UI components following the design system    |
| `/ak-api`       | Create endpoints with validation and error handling |
| `/ak-test`      | Write tests that verify real behavior               |
| `/ak-refactor`  | Improve code without changing behavior              |
| `/ak-docs`      | Generate useful documentation (JSDoc, README, ADR)  |

## How to use a skill

```
/ak-commit
/ak-pr feat: new feature
/ak-review @src/components/Button.tsx
/ak-plan add JWT authentication
/ak-debug submit button not responding on mobile
/ak-handoff implement auth in the next session
```

The repo follows the Contract Based Review Method (CBRM by Bezael Pérez · Dominicode) with its own tools: the next three sections are its **Contract**, **Lane** and **Verdict**. `.ak/config.md` records the same commands for the `/ak-` skills and `npx ai-workflow-kit verify --final`.

## Contract

Work starts from a contract, never from a vague request. The contract is the list of acceptance criteria for the change, and each criterion has the command that proves it.

- **Where the contract lives:** `specs/<slug>/plan.md` (`/ak-plan`) or `specs/<slug>/tasks.md` (SDD), each step with its `Verify:` command. For a skill, the `contract:` and `acceptance:` fields of `src/skills/<id>.md` are part of it.
- **No contract, no code.** If the change has no acceptance criteria, write them and get them approved before touching code.
- **The contract is the only source of scope.** If implementing it requires a decision the contract does not make, stop and update the contract first.
- **Before proposing a feature, check [`.out-of-scope/`](.out-of-scope/README.md).** It holds one file per thing this repo has decided not to build, with the reasoning — so a settled decision isn't re-litigated. A request declined on design grounds gets a new file there.

A change is done when:

1. Every acceptance criterion has evidence: which command proves it and what its output was (`npx ai-workflow-kit verify <slug> --final` runs them all).
2. The short loop and the long loop of the Lane pass, with no new reds.
3. The diff contains nothing the contract did not request.

## Lane

The lane is where the agent is allowed to work and the harness it uses to check itself. Leaving the lane requires explicit permission.

### Stack

- **Language:** JavaScript ESM (`bin/`, `scripts/`), Bash (`hooks/`), TypeScript loaded by Pi (`pi/extensions/`), Markdown + YAML (`src/skills/`)
- **Package manager:** npm — derived from `package-lock.json`. Do not use another.
- **Runtime / version:** Node 24 in CI
- **Tests:** Vitest (`evals/hooks`, `evals/cli`, `evals/pi`); LLM skill evals in `evals/run-evals.js`

### Harness

These commands have been run and checked. If one fails, the work is not done.

#### Short loop — after every change

```bash
npm test   # 28s: build:check (drift + eval coverage), then the Vitest suites
```

#### Long loop — before opening the PR

```bash
npm test   # 28s
```

CI runs `npm run build:check` and `npm test` on every PR. The LLM skill evals (`npm run eval`) are not in either loop: they need `ANTHROPIC_API_KEY` and spend real tokens. Run them by hand, or through the Evals workflow's `run_llm_evals` input, when the contract changes a skill's prompt.

#### Known reds

None. The entire harness is green as of 2026-10-21.

### Conventions

- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- PRs: always with description + test plan, closing with the Verdict below
- Tests: before merge, not after
- Code language: English. Comments: English.
- A skill is edited in `src/skills/<id>.md` only, then `npm run build`; the distributions are generated (see the top of this file).

### Boundaries

What the agent must not touch without explicit permission:

- Files outside the change scope declared in the contract
- Generated files by hand: `skills/`, `antigravity-skills/`, `codex-prompts/`, `pi/skills/`
- `hooks/*.sh`: they are safety guardrails for every user of the kit
- `.github/workflows/`, `scripts/release.js` and the release flow (version bumps, tags, `CHANGELOG.md` release headings)
- Dependencies: do not add or update packages without asking first
- A decision recorded in `.out-of-scope/`
- Secrets, `.env` files, and credentials

## Verdict

The verdict is what the reviewer reads instead of the diff. The agent does not say "done"; it delivers a verdict, and the verdict is only as good as its evidence. `/ak-review` emits the alignment part.

```markdown
Status: PASS | CHANGES REQUIRED
Alignment: Exact | Tangling | Missing | Missing and Tangling

| # | Acceptance criterion | Status | Evidence |
|---|----------------------|--------|----------|
| 1 | ...                  | PASS   | `command` -> output |

Long loop: {{summarized output}}
New reds: none | {{list}}
Out-of-scope changes: none | {{list with justification}}
Not run: none | {{checks that were not executed, and why}}
```

- **Exact**: the change covers every criterion and nothing else. **Tangling**: it includes code no criterion asks for. **Missing**: a criterion is not satisfied. **Missing and Tangling**: both.
- Only `Exact` can be `PASS`, unless the deviation was accepted and written into the contract first.
- A check that was not executed is reported as *not run*, never as PASS. LLM evals not run on a prompt change go here.
- The reviewer inspects the diff only where the verdict is red or the evidence is missing.

## Project memory

Memory is split across multiple files for clarity and maintainability:

| File | Contents |
|------|----------|
| `memory/MEMORY.md` | Index — start here, lists all memory files |
| `memory/project.md` | Architecture decisions, stack, business context |
| `memory/feedback.md` | What to repeat, what to avoid, team preferences |
| `memory/user.md` | Team roles, expertise, communication style |
| `memory/decisions/` | Individual ADRs — one file per decision |

**At the start of each non-trivial session:** read `memory/MEMORY.md`, then load the relevant files.
**At the end of a session with learnings:** run `/ak-memory save` to persist them.
