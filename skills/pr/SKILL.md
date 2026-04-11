---
name: ak:pr
description: Create a Pull Request with description, test plan, and checklist. Use when the user says /pr, "create PR", or "open pull request". Reads real branch commits and diff.
disable-model-invocation: true
argument-hint: [feat|fix|chore: title]
allowed-tools: Bash(git *) Bash(gh *)
---

# Skill: /pr

Creates a Pull Request with a clear description, test plan, and checklist. Reads the real branch commits.

## Context

- Current branch: !`git branch --show-current`
- Commits in this branch: !`git log main..HEAD --oneline`
- Changed files: !`git diff main..HEAD --name-only`
- Diff summary: !`git diff main..HEAD --stat`

## When to use it

When the user writes `/pr` or asks to "create PR" / "open pull request".

## Steps

1. Read the **Context** above — branch, commits, and changed files are already loaded.
2. With that information, build:

### PR structure

```markdown
## What does this PR do?
[1-3 bullets with the main change. Focus on the "what" and "why", not the "how".]

## Main changes
- [file or module]: [what changed]
- [file or module]: [what changed]

## Test plan
- [ ] [Relevant manual or automated test case]
- [ ] [Another case]

## Notes for the reviewer
[Additional context: design decisions, trade-offs, things to watch out for.]

## Screenshots (if applicable)
[Remove if no visual changes]
```

6. Propose title and body. Ask if it's good before running `gh pr create`.

## Rules

- PR title follows Conventional Commits: `feat(scope): description`
- If the PR mixes multiple concerns, suggest splitting it.
- If `gh` is not installed, generate the text to paste manually in GitHub.
