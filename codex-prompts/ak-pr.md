---
description: Create a Pull Request with description, test plan, and checklist. Reads real branch commits and diff.
argument-hint: "[feat|fix|chore: title]"
---

# /ak-pr

Creates a Pull Request with a clear description, test plan, and checklist. Reads the real branch commits.

Requested title (may be empty): $ARGUMENTS

## Context to gather first

Run these commands and read their output before writing the PR:

```bash
git branch --show-current        # current branch
git log main..HEAD --oneline     # commits in this branch
git diff main..HEAD --name-only  # changed files
git diff main..HEAD --stat       # diff summary
```

If the base branch isn't `main`, substitute the real one (`master`, `develop`, …).

## Steps

1. Read the context above — branch, commits, and changed files.
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

3. Propose title and body. Ask if it's good before running `gh pr create`.

## Rules

- PR title follows Conventional Commits: `feat(scope): description`
- If the PR mixes multiple concerns, suggest splitting it.
- If `gh` is not installed, generate the text to paste manually in GitHub.
