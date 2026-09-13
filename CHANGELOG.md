# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [2.6.0] - 2026-09-13

### Added
- **risk**: `--focus` — a per-file **review need** (`HIGH` / `MEDIUM` / `LOW`) with its reasons as text, built on the existing history signal plus two new sources: the sensitive paths declared in `.ak/config.md` (`## Review` → `Sensitive paths`, always HIGH, the reason names the glob) and the file kind (docs, lockfiles and fixtures are LOW; tests keep their history level). `new` maps to MEDIUM — no history is unknown risk. The plain `risk` table is byte-identical without the flag; `--json` always carries `need`, `reasons`, `kind` and a `focus` summary with `humanReviewRequired`. Dependency-free `**` / `*` / `?` globs.
- **pr**: a **Review focus** section in both PR body structures — one row per changed file with its need and reason, HIGH first — and a `Human review required: yes | no` line; a `needs-human-review` / `low-risk` label suggestion applied only when `gh label list` shows the label exists. Splitting the PR is now an *offer* gated on independence (whole files, no LOW file referencing a symbol the HIGH files change), never the default: one PR with the attention map inside it.
- **setup**: detects candidate sensitive directories (`auth`, `billing`, `migrations`, `permissions`, `crypto`, …) that actually exist, confirms them in the same batched round, and records them under `## Review` as globs.
- **review**: files matching a sensitive path start the deep review alongside the `HIGH` files, whatever their history.
- **evals**: unit cases for `readSensitivePaths`, `globToRegExp`, `fileKind`, `reviewNeed`, and `--focus --json` / plain-table integration cases against a temp repo declaring `src/auth/**`.

---

## [2.5.0] - 2026-08-30

### Added
- **risk**: `npx ai-workflow-kit risk [files...]` — a deterministic churn / fix-history risk signal for the files under review (the honest version of the "bug proneness" stage from agentic code review research: Nagappan & Ball on churn, Kim et al. on fix hotspots). One `git log` aggregated per file into `HIGH` / `MEDIUM` / `low` — or `new` for files with no history, which is unknown risk, not low. `--base`, `--window Nd/Nw/Nm/Ny`, `--json`; sparse history is reported as a weak signal. `/ak:review` runs it to decide where review depth goes first; the signal orders the review and is never itself a finding.
- **review**: the SDD compliance layer now closes with an explicit PR-issue **alignment verdict** — `Exact` / `Tangling` / `Missing` / `Missing and Tangling` (taxonomy from Isik et al., via "Rethinking Code Review in the Age of AI"). A verdict other than `Exact` cannot be `PASS` unless the user explicitly accepted the deviation.
- **review**: a closing **"Close the loop"** step — durable learnings a review surfaces (decision confirmed or overturned, alternative rejected with its reason, risk that materialized) are offered to `memory/decisions/` so the next review starts from them instead of rediscovering them.
- **memory**: review retrospectives are a first-class `save` category routed to `memory/decisions/`.
- **evals**: `evals/cli/risk.test.js` — fix-subject detection, window parsing, aggregation/classification, and integration cases against a real temp git repository; the review acceptance case now also requires the `Missing and Tangling` alignment verdict on the drifted fixture.

### Changed
- **readme**: refreshed the v2.4.0 cover and fixed stale install/contribute sections.
- **out-of-scope**: declined scaffold and changelog skills (#1, #3), with the reasoning on record.

### Fixed
- **commit**: binary assets no longer derail the generated message (#2).

---

## [2.4.0] - 2026-08-30

### Added
- **verify**: `specs/<slug>/tasks.md` support — the engine that ran `plan.md` steps now runs SDD task lists with the same checkbox + `` Verify: `cmd` `` grammar. When both files exist, `tasks.md` wins; `--plan` flips it back. The SDD tool (sdd-creator) owns spec/plan/tasks content; the kit only ticks what a command proved.
- **verify**: `--final` — read-only final verification: re-runs every step's Verify (regressions in ticked tasks included), then the `Test` / `Lint` / `Typecheck` / `Build` / `E2E` commands from `.ak/config.md`'s `## Commands`, and prints a summary ending in `Result: PASS | FAIL`. `parseConfigCommands()` makes the config a contract the CLI actually executes.
- `/ak:execute` — works an SDD feature one task at a time: announce (task, criterion, files, Verify), implement only that, let `verify` tick the box, at most three fix attempts on a red, and a hard stop on any spec gap — reflow belongs to the SDD tool, not to improvisation in code.
- **review**: an SDD-aware layer — with `specs/<slug>/` present the review opens with `Status: PASS | CHANGES REQUIRED` and a Requirements compliance section (criteria implemented/missing, tasks ticked without a real implementation, out-of-scope code, uncovered criteria) before the usual severity buckets.
- **pr**: SDD traceability — with specs present the body adds Specification, implemented acceptance criteria, a Verification section that only reports what actually ran (`not run` is an honest value), and an Issue → Spec → Tasks → Implementation → Verification line.
- **evals**: `evals/cli/sdd-verify.test.js` (tasks.md discovery and preference, tick/fail/recheck on tasks, `--final`, config parsing) and `evals/fixtures/sdd-project/` — a spec whose implementation drifted from its task list, for the review compliance rubric.
- **spec**: an acceptance case may carry its own `criteria`, replacing the shared list for that case alone (`resolveAcceptance`).
- **plan/verify**: `/ak:plan` persists plans as resumable `specs/<slug>/plan.md`, and `npx ai-workflow-kit verify` runs each step's `Verify:` command and ticks the box only on exit 0 — with `--all`, `--recheck`, and `--dry-run`.
- **build**: every distribution (`skills/`, `antigravity-skills/`, `codex-prompts/`) is rendered from a single `src/skills/<id>.md` source; editing a generated file fails `build:check`.
- **build**: CI eval-coverage ratchet — a skill ships either executable acceptance cases or a listed, reasoned `pending` entry, and the allowlist only shrinks.
- **install**: OpenAI Codex support — the same skills ship as flat `/ak-*` prompts in `codex-prompts/`, installed with `npx ai-workflow-kit --codex`.
- **install**: Antigravity's global root moved to `~/.gemini/config/skills/`; the installer writes there, and uninstall cleans both the old path and the legacy flat skill layout.
- `/ak:help` — routes a task to the one skill that fits it, or says plainly that none does. Its catalogue of the set is generated from the specs, so it can't go stale.
- `/ak:setup` — detects the repo's default branch, commands, git host and commit convention into `.ak/config.md`. `/ak:commit`, `/ak:pr`, `/ak:plan`, `/ak:review` and `/ak:debug` read it when it exists, and fall back to defaults when it doesn't.
- **spec**: `invocation: user | model` on every skill. A user-invoked skill's description must not carry model-facing trigger phrasing, a model-invoked one must — both enforced by the schema. `disable-model-invocation` is now derived from it rather than hand-written.
- **spec**: `status: stable | experimental | deprecated`, so a skill can ship unfinished or be retired visibly. Non-stable skills get a banner in every distribution and a warning in the installer; `deprecated` requires `replaced_by`.
- **build**: `src/manifest.json`, generated — id, status, invocation and description per skill. The dependency-free CLI reads it instead of parsing YAML.
- **docs**: `docs/skills/` — one page per skill on a fixed frame (what it does, when to reach for it, how to tell it's working, where it fits), plus an index.
- **docs**: `docs/authoring-skills.md` — the spec fields, the build pipeline, and the conventions the gates enforce.
- **docs**: `.out-of-scope/` — one file per feature decided against, with the reasoning.
- **evals**: `evals/skills/help.eval.js`, the first eval whose cases need no fixture, and `evals/cli/spec.test.js` covering the schema gates.

### Changed
- **setup**: `.ak/config.md`'s `## Commands` gains `E2E` and `Formatter`, and is now documented as executable by `verify --final` — what the file records is what the harness runs.
- **plan**: the `spec.md exists` branch of Step 0 now routes to `/ak:execute` instead of describing the task-working inline; the plan/spec boundary itself is unchanged.
- **hooks**: README documents the guardrails-vs-Final-Verify split — hooks act at edit time, `--final` at completion time, and hooks deliberately don't participate in it.
- **debug**: added a Redact section, a minimise-the-repro phase, and 3-5 falsifiable hypotheses with explicit predictions in place of bare probability labels.
- **skills**: descriptions of user-invoked skills stripped of trigger phrasing; `/ak:memory` and `/ak:review` gained the triggers they needed to fire at all.
- **build**: `npm run build` and `build:check` now also sync and verify the docs — install block, CLI flags, skill tables, and one docs page per skill.
- **build**: install wording has one home in `src/install-block.md`, injected into both READMEs by `scripts/sync-docs.js`.
- **release**: re-syncs the install block after the version bump, so the READMEs don't go stale in the release commit itself.

### Fixed
- **verify**: `-y` was parsed as a slug instead of as the short form of `--yes`.
- **verify**: commands ran in the process cwd, ignoring the `root` the engine was given.
- **evals**: `review.eval.js` still destructured the pre-`cases` acceptance shape and crashed on run; it now resolves cases through `resolveAcceptance()` like every other eval.
- README.md pinned `2.2.0-beta.1` as the example version.
- README.es.md documented neither `--global` nor `--local`, which the CLI has long accepted.
- Both READMEs' skill tables predated `/ak:handoff` and `/ak:memory`.
- Antigravity's `{{args}}` placeholder fell back to "the path the user gave" for every skill, including ones whose argument is a problem description.
- CLAUDE.md told contributors to keep `codex-prompts/` in sync by hand, which `build:check` has forbidden since the generator landed.

---

## [2.3.0] - 2026-06-25

### Added
- Add /ak:handoff skill and update CLAUDE.md

### Fixed
- Update SKILL.md to clarify task execution steps

## [2.2.0] - 2026-05-24

### Added
- **cli**: Flags `--claude`, `--cursor`, `--copilot`, `--antigravity` to skip IDE prompt
- **cli**: Local and global installation options (`--local`, `--global`)
- **cli**: Interactive selection menu with improved category and item handling
- Skills: `/commit`, `/debug`, `/memory`, `/plan`, `/pr`, `/review`, `/vibe-audit`
- Agents: `/api`, `/docs`, `/frontend`, `/refactor`, `/test`
- Memory management documentation and changelog guidelines
- Support for Google Antigravity alongside Claude Code, Cursor, and Copilot

### Fixed
- Argument-hint YAML formatting in skill documentation
- CLI scope selection logic for non-interactive modes
- CLI uninstall option included in scope selection

### Changed
- Enhanced CLI skill management with improved listing and copying functions
- Updated project architecture decisions and stack documentation

---

## [2.1.0] - 2026-04-11

### Added
- Update README.es.md to introduce AI Workflow Kit and enhance installation instructions
- Add documentation for Google Antigravity and cross-tool agent rules

## [2.0.0] - 2026-04-09

### Changed
- Update command prefixes in documentation to use '/ak:' format

### Fixed
- Update GitHub Actions workflow to handle missing ANTHROPIC_API_KEY

## [1.1.0] - 2026-04-06

### Added
- Add GitHub Actions workflow for LLM skill evaluations
- Add /deploy skill
- Initialize AI Workflow Kit with evals, CLI, and testing framework
- Add initial project structure with installation scripts, hooks, and documentation

## [1.1.0] - 2026-04-06

### Added
- Add GitHub Actions workflow for LLM skill evaluations
- Add /deploy skill
- Initialize AI Workflow Kit with evals, CLI, and testing framework
- Add initial project structure with installation scripts, hooks, and documentation

## [1.0.0] - 2026-04-06

### Added
- Skills: `/commit`, `/pr`, `/review`, `/plan`, `/debug`, `/vibe-audit`
- Agents: `/frontend`, `/api`, `/test`, `/refactor`, `/docs`
- Hooks: `pre-bash-safety`, `pre-commit-secrets`, `post-write-format`, `post-edit-lint`, `notify-done`
- CLI installer (`npx ai-workflow-kit`) with `--skills`, `--hooks`, `--yes`, `--list`, `--uninstall` flags
- Memory pattern (`memory/project.md`)
- Support for Claude Code, Cursor, and GitHub Copilot
- Eval framework with Vitest + LLM-based evals via Anthropic SDK
- Spanish README (`README.es.md`)[1.1.0]: https://github.com/bezael/ai-workflow-kit/compare/...v1.1.0[2.0.0]: https://github.com/bezael/ai-workflow-kit/compare/v1.1.0...v2.0.0
[2.2.0]: https://github.com/bezael/ai-workflow-kit/compare/v2.1.0...v2.2.0
[Unreleased]: https://github.com/bezael/ai-workflow-kit/compare/v2.6.0...HEAD
[2.6.0]: https://github.com/bezael/ai-workflow-kit/compare/v2.5.0...v2.6.0
[2.5.0]: https://github.com/bezael/ai-workflow-kit/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/bezael/ai-workflow-kit/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/bezael/ai-workflow-kit/compare/v2.2.0...v2.3.0
