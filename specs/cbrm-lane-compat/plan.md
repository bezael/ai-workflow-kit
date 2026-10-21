# Plan: Read the CBRM lane — `verify --final` and `/ak-setup` understand `AGENTS.md`

Status: done
Updated: 2026-10-21

## Goal
A repo prepared with CBRM (`dominicode-harness-init` from `bezael/sdd-creator`) keeps its harness in `AGENTS.md`, under `#### Short loop` and `#### Long loop`. A repo prepared with this kit keeps it in `.ak/config.md`. Each tool reads the other's format, so a user can mix them without recording the same commands twice; neither writes the other's file.

## Context
Decided with the user on 2026-10-21: the two tools stay separate and compatible (option "a"), rather than merging CBRM into the kit. The other half lives in sdd-creator: its verified-done check falls back to `.ak/config.md`, and harness-init reads `.ak/config.md` as a source of candidate commands.

The lane format is defined by harness-init's template: a heading containing `Short loop` / `Long loop`, then the first fenced block under it, one command per line, trailing `# comment` allowed, a comment containing `known red` marking a command that fails for reasons predating the agent.

## Acceptance criteria
1. `parseLaneCommands(root)` returns the commands of both loops of `AGENTS.md`, without duplicates, comments or blank lines, each with `knownRed`; nothing when there is no `AGENTS.md` or no loop section.
2. `verify --final` runs the lane commands as global checks after the `.ak/config.md` ones; a command already in `.ak/config.md` runs once.
3. A failing lane command fails `--final`; a failing `known red` one is reported but does not.
4. `--dry-run` lists the lane commands; the summary names where each global check came from.
5. `/ak-setup` treats a CBRM lane as a source of commands already verified by harness-init, maps them to `## Commands`, and never writes `AGENTS.md`.

## Files to be touched
- `bin/plan-verify.js` — `parseLaneLoop`, `parseLaneCommands`; `runFinal` merges them into the global checks.
- `evals/cli/sdd-verify.test.js` — cases for criteria 1–4.
- `src/skills/setup.md` — lane as a detection source; contract + acceptance lines. Then `npm run build`.
- `docs/skills/setup.md`, `docs/skills/execute.md`, `README.md`, `README.es.md`, `CHANGELOG.md`.

## Steps
- [x] 1. Tests for `parseLaneCommands` and the lane in `--final` (red first).
      Verify: `npx vitest run evals/cli/sdd-verify.test.js`
- [x] 2. `bin/plan-verify.js`: parser and `runFinal` integration.
      Verify: `npx vitest run evals/cli/sdd-verify.test.js`
- [x] 3. `src/skills/setup.md`: read the lane; `npm run build`.
      Verify: `npm run build:check && grep -q "Short loop" skills/ak-setup/SKILL.md && grep -q "Short loop" pi/skills/ak-setup/SKILL.md`
- [x] 4. Docs and CHANGELOG.
      Verify: `npm test`
- [x] 5. This repo: `verify cbrm-lane-compat --final` runs `npm test` once although both `.ak/config.md` and `AGENTS.md` list it.
      Verify: `node bin/cli.js verify cbrm-lane-compat --final --dry-run`

## Risks / decisions
- The lane parser is duplicated from sdd-creator's `verified-done-core.mjs` rather than imported: the kit has no runtime dependency on sdd-creator, and the format is small and fixed by a template. Both carry tests for the same cases.
- `--final` runs both loops, because CBRM's definition of done requires both; they usually share commands, and duplicates run once.
- `/ak-setup` does not write the lane: two tools writing one file would fight. A user who wants the lane runs harness-init.
