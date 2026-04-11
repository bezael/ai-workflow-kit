# Skill: pr

Creates a Pull Request with a clear description, test plan, and checklist. Reads the real branch commits.

## Trigger

When the user writes `@pr` or asks to "create PR" / "open pull request".

## Steps

1. Detect the current branch: `git branch --show-current`
2. Detect the base branch (main or master): `git remote show origin | grep HEAD`
3. Read the branch commits: `git log main..HEAD --oneline`
4. Read the full diff: `git diff main..HEAD --stat`
5. With that information, build:

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
