---
id: pr
name: pr
description: >-
  Open a Pull Request whose description, test plan, and checklist come from the
  branch's real commits and diff.
invocation: user
argument-hint: "[feat|fix|chore: title]"

contract:
  - Title follows Conventional Commits — `type(scope): description`
  - Body contains What / Main changes / Test plan / Notes for the reviewer
  - Test plan lists at least one concrete, verifiable case
  - Main changes map to files that actually appear in the diff
  - Nothing is described that the diff does not contain

acceptance:
  threshold: 0.8
  pending: no branch fixture yet — needs a repo fixture with commits to diff
  criteria:
    - Title is a valid Conventional Commits subject of 72 characters or fewer
    - Body includes all four sections: What / Main changes / Test plan / Notes
    - Every entry under "Main changes" names a file or module present in the diff
    - Test plan contains at least one concrete case a reviewer could execute
    - Does not claim changes that are absent from the diff

context:
  - label: Current branch
    command: git branch --show-current
  - label: Commits in this branch
    command: git log main..HEAD --oneline
  - label: Changed files
    command: git diff main..HEAD --name-only
  - label: Diff summary
    command: git diff main..HEAD --stat

targets:
  claude:
    frontmatter:
      allowed-tools: Bash(git *) Bash(gh *)
  antigravity: {}
  codex: {}
---

# Skill: {{invoke}}

Creates a Pull Request with a clear description, test plan, and checklist. Reads the real branch commits.

If `.ak/config.md` exists, read it first: it records the base branch, the git host, and whether `gh` is available. Without it, assume `main` and GitHub via `gh`.

## Requested title

{{args}}

{{context}}

If the base branch isn't `main`, substitute the real one (`master`, `develop`, …).

## When to use it

When the user writes {{invoke}} or asks to "create PR" / "open pull request".

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
