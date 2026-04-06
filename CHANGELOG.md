# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [1.0.0] - 2026-04-06

### Added
- Skills: `/commit`, `/pr`, `/review`, `/plan`, `/debug`, `/vibe-audit`
- Agents: `/frontend`, `/api`, `/test`, `/refactor`, `/docs`
- Hooks: `pre-bash-safety`, `pre-commit-secrets`, `post-write-format`, `post-edit-lint`, `notify-done`
- CLI installer (`npx ai-workflow-kit`) with `--skills`, `--hooks`, `--yes`, `--list`, `--uninstall` flags
- Memory pattern (`memory/project.md`)
- Support for Claude Code, Cursor, and GitHub Copilot
- Eval framework with Vitest + LLM-based evals via Anthropic SDK
- Spanish README (`README.es.md`)

[Unreleased]: https://github.com/bezael/ai-workflow-kit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/bezael/ai-workflow-kit/releases/tag/v1.0.0
