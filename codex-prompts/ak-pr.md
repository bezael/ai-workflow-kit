---
description: Open a Pull Request whose description, test plan, and checklist come from the branch's real commits and diff.
argument-hint: "[feat|fix|chore: title]"
---

# Skill: /ak-pr

Creates a Pull Request with a clear description, test plan, and checklist. Reads the real branch commits.

If `.ak/config.md` exists, read it first: it records the base branch, the git host, and whether `gh` is available. Without it, assume `main` and GitHub via `gh`.

## Requested title

$ARGUMENTS

## Context to gather first

Run these commands and read their output before starting:

```bash
git branch --show-current   # Current branch
git log main..HEAD --oneline   # Commits in this branch
git diff main..HEAD --name-only   # Changed files
git diff main..HEAD --stat   # Diff summary
```

If the base branch isn't `main`, substitute the real one (`master`, `develop`, …).

## When to use it

When the user writes /ak-pr or asks to "create PR" / "open pull request".

## Steps

1. Read the context above — branch, commits, and changed files.

2. **Look for SDD context.** Check whether a `specs/<slug>/` directory covers
   this branch — match the slug against the branch name or the changed paths.
   No match: use the standard structure below, nothing changes.

3. With that information, build:

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

### PR structure when `specs/<slug>/` covers the branch

Read `spec.md` and `tasks.md`, and if the working tree shows a final
verification was run (or run `npx ai-workflow-kit verify <slug> --final`
yourself, with the user's go-ahead), use its real results:

```markdown
## Source
[Closes #NNN — only if the spec or branch names an issue; omit otherwise]

## Specification
`specs/<slug>/spec.md`

## What does this PR implement?
- AC-01 [criterion, one line]
- AC-02 [...]
[Only the acceptance criteria this branch actually implements]

## Main changes
- [file or module]: [what changed]

## Verification
- Tasks: [N/N ticked by `verify` | state what is unticked]
- Tests: [PASS | FAIL | not run]
- Lint: [PASS | FAIL | not run]
- Typecheck: [PASS | FAIL | not run]
- Build: [PASS | FAIL | not run]
[One line per check that exists in .ak/config.md. "not run" is an honest
value; an invented PASS is not.]

## Traceability
Issue → Spec → Tasks → Implementation → Verification

## Notes for the reviewer
[Design decisions, trade-offs, things to watch out for.]

## Risks / out of scope
[Criteria deliberately not covered by this PR, and anything risky.]
```

4. Propose title and body. Ask if it's good before running `gh pr create`.

## Rules

- PR title follows Conventional Commits: `feat(scope): description`
- If the PR mixes multiple concerns, suggest splitting it.
- If `gh` is not installed, generate the text to paste manually in GitHub.
- Never invent verification results. A check that wasn't executed is listed
  as "not run" — the Verification section reports evidence, not optimism.
- `gh pr create` runs after your confirmation, i.e. in a later turn than the one
  that invoked this skill. A frontmatter grant has already expired by then, so
  the allow rule for it belongs in your permission settings.
