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
  - When specs/<slug>/ SDD artifacts cover the branch, the body adds spec link, acceptance criteria, verification results, and traceability
  - Verification results only report what was actually run — never an assumed PASS
  - Body carries a Review focus table — every changed file with a HIGH / MEDIUM / LOW review need and its reason — and a "Human review required: yes | no" line
  - The review need comes from `npx ai-workflow-kit risk --focus` (sensitive paths, fix history, file kind); when npx is unavailable the fallback heuristic is used and the body says so
  - Splitting the PR is offered, never done by default, and only when the LOW-only files reference nothing in the HIGH files

acceptance:
  threshold: 0.8
  pending: no branch fixture yet — needs a repo fixture with commits to diff
  criteria:
    - Title is a valid Conventional Commits subject of 72 characters or fewer
    - Body includes all four sections: What / Main changes / Test plan / Notes
    - Every entry under "Main changes" names a file or module present in the diff
    - Test plan contains at least one concrete case a reviewer could execute
    - Does not claim changes that are absent from the diff
    - With specs/<slug>/ artifacts present, includes Specification, implemented acceptance criteria, Verification, and Traceability sections
    - Reports as PASS only verifications whose commands were actually executed
    - Includes a Review focus table listing every changed file with a level and a reason
    - States "Human review required: yes" iff at least one file is HIGH
    - A file under a sensitive path from .ak/config.md is HIGH even when it is documentation or brand new
    - Does not split the PR unless the user accepts the offer, and does not offer it when a LOW file references a symbol changed in a HIGH file

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

If `.ak/config.md` exists, read it first: it records the base branch, the git host, whether `gh` is available, and — under `## Review` — the sensitive paths whose every change needs a human. Without it, assume `main` and GitHub via `gh`, and no declared sensitive paths.

## Requested title

{{args}}

{{context}}

If the base branch isn't `main`, substitute the real one (`master`, `develop`, …).

## When to use it

When the user writes {{invoke}} or asks to "create PR" / "open pull request".

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
