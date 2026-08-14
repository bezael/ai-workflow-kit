---
name: pr
description: Open a Pull Request whose description, test plan, and checklist come from the branch's real commits and diff.
---

# Skill: @pr

Creates a Pull Request with a clear description, test plan, and checklist. Reads the real branch commits.

If `.ak/config.md` exists, read it first: it records the base branch, the git host, and whether `gh` is available. Without it, assume `main` and GitHub via `gh`.

## Requested title

the request the user typed

## Context to gather first

Run these and read the output before starting:

```bash
git branch --show-current   # Current branch
git log main..HEAD --oneline   # Commits in this branch
git diff main..HEAD --name-only   # Changed files
git diff main..HEAD --stat   # Diff summary
```

If the base branch isn't `main`, substitute the real one (`master`, `develop`, …).

## When to use it

When the user writes @pr or asks to "create PR" / "open pull request".

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
- `gh pr create` runs after your confirmation, i.e. in a later turn than the one
  that invoked this skill. A frontmatter grant has already expired by then, so
  the allow rule for it belongs in your permission settings.
