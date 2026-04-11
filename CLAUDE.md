# CLAUDE.md — AI Workflow Kit

## What this repo is

A collection of skills, agents, and memory patterns to make working with AI coding tools faster and more consistent.
Works with: **Claude Code**, **Cursor**, **GitHub Copilot**, **Google Antigravity**.

## Available Skills

| Command          | Description                                         |
|------------------|-----------------------------------------------------|
| `/ak:commit`     | Generates commit message with real diff context     |
| `/ak:pr`         | Creates PR with description, test plan, and checklist |
| `/ak:review`     | Reviews code or PR with configurable criteria       |
| `/ak:plan`       | Plans before executing complex tasks                |
| `/ak:debug`      | Structured debugging workflow                       |
| `/ak:vibe-audit` | Audit of apps generated with vibe coding          |

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
```

## Project conventions

- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`)
- PRs: always with description + test plan
- Tests: before merge, not after
- Code language: English. Comments: English.

## Default stack

Adapt this section to your real project. Example:
- Frontend: React + TypeScript + Tailwind
- Backend: Node.js / Express
- Tests: Vitest / Jest
- CI/CD: GitHub Actions

## Project memory

See `memory/project.md` for architecture decisions and accumulated context.
