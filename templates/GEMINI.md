# GEMINI.md — AI Workflow Kit

## What this repo is

A collection of skills, agents, and memory patterns to make working with AI coding tools faster and more consistent.
Works with: **Claude Code**, **Cursor**, **GitHub Copilot**, **Google Antigravity**.

## Skills and agents

The kit's skills are installed under `.agents/skills/` (project) or `~/.gemini/config/skills/` (global) and are the source of truth for what exists. Type `@help` with a task to be pointed at the one that fits.

## Project conventions

- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- PRs: always with description + test plan
- Tests: before merge, not after
- Code language: English. Comments: English.

## Agent behavior

- Read existing code before suggesting changes
- Follow patterns already established in the project
- Prefer editing existing files over creating new ones
- Diagnose before proposing fixes — a plan is worth more than fast code
- Don't add dependencies without mentioning it explicitly

## Default stack

Adapt this section to your real project. Example:
- Frontend: React + TypeScript + Tailwind
- Backend: Node.js / Express
- Tests: Vitest / Jest
- CI/CD: GitHub Actions

## Project memory

See `memory/project.md` for architecture decisions and accumulated context.
