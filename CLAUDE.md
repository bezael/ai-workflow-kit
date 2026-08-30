# CLAUDE.md — AI Workflow Kit

## What this repo is

A collection of skills, agents, and memory patterns to make working with AI coding tools faster and more consistent.
Works with: **Claude Code**, **Cursor**, **GitHub Copilot**, **Google Antigravity**, **OpenAI Codex**.

For Codex the same skills ship as flat slash commands in `codex-prompts/` (`/ak-commit` instead of `/ak:commit`) — install them with `npx ai-workflow-kit --codex`.

**Every skill is generated.** The one hand-written file is `src/skills/<id>.md`; `skills/`, `antigravity-skills/`, and `codex-prompts/` are rendered from it by `npm run build`. Editing a generated file fails `npm run build:check` in CI. See [docs/authoring-skills.md](docs/authoring-skills.md) for the spec fields, the `invocation` axis, and the eval-coverage ratchet.

### Where each tool reads skills from

| Tool | Global | Project |
|------|--------|---------|
| Claude Code | `~/.claude/skills/<name>/SKILL.md` | `.claude/skills/` |
| Antigravity | `~/.gemini/config/skills/<name>/SKILL.md` | `.agents/skills/` |
| Codex | `~/.codex/prompts/<name>.md` (flat, no dirs) | — |

Antigravity's global root moved from `~/.gemini/antigravity/` to `~/.gemini/config/`; the old path only still works on installs that migrated in place, via a compatibility symlink. Don't write to it. Rules for Antigravity are `GEMINI.md`, `AGENTS.md`, and `.agents/rules/*.md`.

## Available Skills

<!-- ak:skill-table -->

| Command                      | Description                                         |
|------------------------------|-----------------------------------------------------|
| `/ak:help [task]`            | Points at the one skill that fits the task at hand  |
| `/ak:setup`                  | Records the repo's branch, commands, and conventions in `.ak/config.md` |
| `/ak:commit`                 | Generates commit message with real diff context     |
| `/ak:pr`                     | Creates PR with description, test plan, and checklist |
| `/ak:review`                 | Reviews code or PR with configurable criteria       |
| `/ak:plan`                   | Plans before executing, into a resumable `specs/<slug>/plan.md` |
| `/ak:execute [slug]`         | Executes the next pending SDD task from `specs/<slug>/tasks.md`, verified |
| `npx ai-workflow-kit verify` | Runs a plan's or task list's Verify commands, ticks only what passes; `--final` adds the global checks from `.ak/config.md` |
| `/ak:debug`                  | Structured debugging workflow                       |
| `/ak:vibe-audit`             | Audit of apps generated with vibe coding            |
| `/ak:handoff [focus]`        | Compact the conversation for a fresh agent to continue |
| `/ak:memory save [topic]`    | Persist learnings from the current session          |
| `/ak:memory recall [question]` | Retrieve relevant memory before acting            |
| `/ak:memory clean`           | Remove or update stale memories                     |

## Specialized Agents

| Agent           | When to use                                         |
|-----------------|-----------------------------------------------------|
| `/ak:frontend`  | Create UI components following the design system    |
| `/ak:api`       | Create endpoints with validation and error handling |
| `/ak:test`      | Write tests that verify real behavior               |
| `/ak:refactor`  | Improve code without changing behavior              |
| `/ak:docs`      | Generate useful documentation (JSDoc, README, ADR)  |

## How to use a skill

```
/ak:commit
/ak:pr feat: new feature
/ak:review @src/components/Button.tsx
/ak:plan add JWT authentication
/ak:debug submit button not responding on mobile
/ak:handoff implement auth in the next session
```

## Project conventions

- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- PRs: always with description + test plan
- Tests: before merge, not after
- Code language: English. Comments: English.

**Before proposing a feature, check [`.out-of-scope/`](.out-of-scope/README.md).** It holds one file per thing this repo has decided not to build, with the reasoning — so a settled decision isn't re-litigated. A request declined on design grounds gets a new file there.

## Default stack

Adapt this section to your real project. Example:
- Frontend: React + TypeScript + Tailwind
- Backend: Node.js / Express
- Tests: Vitest / Jest
- CI/CD: GitHub Actions

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
**At the end of a session with learnings:** run `/ak:memory save` to persist them.
