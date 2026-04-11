# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/bezael/ai-workflow-kit/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/bezael/ai-workflow-kit/compare/v2.0.0...v2.1.0
