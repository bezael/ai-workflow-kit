# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- **debug**: added a Redact section, a minimise-the-repro phase, and 3-5 falsifiable hypotheses with explicit predictions in place of bare probability labels.
- **skills**: descriptions of user-invoked skills stripped of trigger phrasing; `/ak:memory` and `/ak:review` gained the triggers they needed to fire at all.
- **build**: `npm run build` and `build:check` now also sync and verify the docs — install block, CLI flags, skill tables, and one docs page per skill.
- **build**: install wording has one home in `src/install-block.md`, injected into both READMEs by `scripts/sync-docs.js`.
- **release**: re-syncs the install block after the version bump, so the READMEs don't go stale in the release commit itself.

### Fixed
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
[Unreleased]: https://github.com/bezael/ai-workflow-kit/compare/v2.3.0...HEAD
[2.3.0]: https://github.com/bezael/ai-workflow-kit/compare/v2.2.0...v2.3.0
