# Memory: Project

Architecture decisions, stack context, and accumulated project knowledge.

---

## Stack and conventions

- Runtime: Node.js (ESM, `"type": "module"`)
- CLI entry: `bin/cli.js` — interactive installer, no external deps
- Tests/evals: `evals/` — uses Anthropic SDK directly, requires `ANTHROPIC_API_KEY` in `.env`
- Package: `ai-workflow-kit`, distributed via `npx`

## Architecture decisions

### 2026-04-11 — Skills and agents use `<name>/SKILL.md` / `<name>/AGENT.md` directory format
**Decision:** All skills live in `skills/<name>/SKILL.md`; all agents in `agents/<name>/AGENT.md`. Supporting files (e.g. `patterns.md`) live alongside the main file in the same directory.
**Why:** Allows skills to ship with companion files. Claude Code also supports this format natively. Flat `.md` files are treated as legacy.
**Alternatives considered:** Single flat `.md` files — rejected because vibe-audit needed a companion `patterns.md`.
**Still valid?** Yes

### 2026-04-11 — Agents are always installed as flat `.md` files to `~/.claude/agents/`
**Decision:** Even though agents are authored in `<name>/AGENT.md` directories, the CLI installs only the `AGENT.md` file to `~/.claude/agents/<name>.md`.
**Why:** Claude Code agents directory expects flat files, not subdirectories.
**Still valid?** Yes

### 2026-04-11 — CLI: interactive numbered menu, no external deps
**Decision:** `bin/cli.js` uses Node.js built-in `readline` for the interactive selection menu.
**Why:** Keeps the installer zero-dependency. Menu supports numbers, shortcuts (a/s/ag/h), and combinations.
**Still valid?** Yes

## Business context

<!-- Domain knowledge the AI needs to make better decisions.
Example:
- "Order" always means a confirmed purchase, not a cart
- Users can have multiple roles simultaneously
- Free tier is limited to 3 projects, paid has no limit
-->

## What NOT to do

<!-- Hard-won negative learnings.
Example:
### 2026-03-10 — Don't use optimistic updates on payment flows
Caused a bug where UI showed success but payment failed silently.
Use pessimistic updates (wait for server confirmation) on anything money-related.
-->
