# GEMINI.md — AI Workflow Kit

## What this repo is

A collection of skills, agents, and memory patterns to make working with AI coding tools faster and more consistent.
Works with: **Claude Code**, **Cursor**, **GitHub Copilot**, **Google Antigravity**.

## Available Skills

| Skill        | Trigger           | Description                                         |
|--------------|-------------------|-----------------------------------------------------|
| commit       | `@commit`         | Generates commit message with real diff context     |
| pr           | `@pr`             | Creates PR with description, test plan, and checklist |
| review       | `@review`         | Reviews code or PR with configurable criteria       |
| plan         | `@plan`           | Plans before executing complex tasks                |
| debug        | `@debug`          | Structured debugging workflow                       |
| vibe-audit   | `@vibe-audit`     | Audit of apps generated with vibe coding            |

## Specialized Agents

| Agent    | Trigger        | When to use                                         |
|----------|----------------|-----------------------------------------------------|
| frontend | `@frontend`    | Create UI components following the design system    |
| api      | `@api`         | Create endpoints with validation and error handling |
| test     | `@test`        | Write tests that verify real behavior               |
| refactor | `@refactor`    | Improve code without changing behavior              |
| docs     | `@docs`        | Generate useful documentation (JSDoc, README, ADR)  |

## How to use a skill

```
@commit
@pr feat: new feature
@review src/components/Button.tsx
@plan add JWT authentication
@debug submit button not responding on mobile
```

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
