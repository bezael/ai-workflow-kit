---
name: ak:pr
description: Open a Pull Request whose description, test plan, and checklist come from the branch's real commits and diff.
argument-hint: "[feat|fix|chore: title]"
disable-model-invocation: true
allowed-tools: Bash(git *) Bash(gh *)
---

# Skill: /ak:pr

Creates a Pull Request with a clear description, test plan, and checklist. Reads the real branch commits.

If `.ak/config.md` exists, read it first: it records the base branch, the git host, whether `gh` is available, and — under `## Review` — the sensitive paths whose every change needs a human. Without it, assume `main` and GitHub via `gh`, and no declared sensitive paths.

## Requested title

$ARGUMENTS

## Context

- Current branch: !`git branch --show-current`
- Commits in this branch: !`git log main..HEAD --oneline`
- Changed files: !`git diff main..HEAD --name-only`
- Diff summary: !`git diff main..HEAD --stat`

If the base branch isn't `main`, substitute the real one (`master`, `develop`, …).

## When to use it

When the user writes /ak:pr or asks to "create PR" / "open pull request".

## Steps

1. Read the context above — branch, commits, and changed files.

2. **Look for SDD context.** Check whether a `specs/<slug>/` directory covers
   this branch — match the slug against the branch name or the changed paths.
   No match: use the standard structure below, nothing changes.

3. **Review focus.** Not every file in the diff deserves the same human
   attention: four `.md` files and one auth change should not get the same
   review budget. Run

   ```
   npx ai-workflow-kit risk --focus --json
   ```

   It gives every changed file a review need — `high` / `medium` / `low` —
   with the reasons as text, from three deterministic sources in this order:
   a **sensitive path** declared in `.ak/config.md` (always HIGH, the reason
   names the glob), the **file kind** (docs, lockfiles and fixtures are LOW),
   and the **fix history** the `risk` signal already computes (`high` →
   HIGH, `medium` → MEDIUM, `low` → LOW, `new` → MEDIUM — no history is
   unknown risk, not low). Tests keep their history level: a weakened
   assertion is a real risk. `focus.humanReviewRequired` is true iff any
   file is HIGH.

   If `npx` is unavailable, approximate it and **say so in the body**: a file
   matching a `Sensitive paths` glob is HIGH; `.md`, lockfiles and fixtures
   are LOW; for the rest count `git log --since="6 months ago" --oneline --
   <file>` and weigh `fix:` subjects heaviest — three or more fixes is HIGH,
   one is MEDIUM, none is LOW, no history at all is MEDIUM.

   The level orders the reviewer's attention. It is **never itself a
   finding** — a HIGH file with nothing wrong in it is a clean result.

4. With that information, build:

### PR structure

```markdown
## What does this PR do?
[1-3 bullets with the main change. Focus on the "what" and "why", not the "how".]

## Main changes
- [file or module]: [what changed]
- [file or module]: [what changed]

## Review focus
Human review required: yes | no

| Need | File | Why |
|---|---|---|
| HIGH | src/auth/session.ts | sensitive path: src/auth/**; 4 fix commits in 6m |
| MEDIUM | src/api/users.ts | new code, unknown risk |
| LOW | docs/auth.md | docs only |
[One row per changed file, HIGH first. Levels from `risk --focus`; if you
used the fallback heuristic, say "levels estimated without `risk --focus`".]

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

## Review focus
Human review required: yes | no

| Need | File | Why |
|---|---|---|
| HIGH | [file] | [reason from `risk --focus`] |
| LOW | [file] | [reason] |

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

5. **Labels.** Suggest `needs-human-review` when the focus says yes and
   `low-risk` when it says no. Apply it with `gh pr create --label` **only
   if `gh label list` shows the label exists** — `gh` fails on an unknown
   label, and creating labels is not this skill's job. Otherwise mention the
   suggested label in the body and move on.

6. **Offer a split — only when it is provably safe.** One PR with the focus
   table is the default: splitting by level produces PRs that are not
   logical units (docs that describe unmerged code, an auth change that ships
   undocumented) and stacked PRs must be rebased in order. Offer a split only
   when *all* of these hold, and let the user decide:

   - the LOW-only group is whole files (never hunks — that is where a diff
     gets corrupted);
   - no LOW file references a symbol, path or identifier the HIGH files
     change (`grep` the names the HIGH diff adds or renames across the LOW
     files);
   - the branch carries more than one concern in the "What" bullets.

   If any of them fails, keep one PR and say why in the notes.

7. Propose title and body. Ask if it's good before running `gh pr create`.

## Rules

- PR title follows Conventional Commits: `feat(scope): description`
- Every changed file appears in the Review focus table, HIGH rows first.
  Never drop a LOW file from the table — "safe to skim" is information too.
- Splitting the PR is an offer gated on step 6, never a default.
- If `gh` is not installed, generate the text to paste manually in GitHub.
- Never invent verification results. A check that wasn't executed is listed
  as "not run" — the Verification section reports evidence, not optimism.
- `gh pr create` runs after your confirmation, i.e. in a later turn than the one
  that invoked this skill. A frontmatter grant has already expired by then, so
  the allow rule for it belongs in your permission settings.
