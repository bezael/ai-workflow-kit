---
id: review
name: review
description: >-
  Review code with real engineering criteria — logic bugs, security
  vulnerabilities, and technical debt. Use when the user says /review, asks for
  a code review, or wants the branch diff checked before opening a PR.
invocation: model
argument-hint: "[file path, or leave empty for the branch diff]"
args_fallback: the path the user gave

# ─── Contract ────────────────────────────────────────────────────────────────
# What the skill must produce, regardless of which tool runs it.
contract:
  - Findings are grouped by severity: Critical / Important / Suggestion
  - Every finding cites a specific line number or code snippet as evidence
  - Every Critical finding carries a concrete fix, not just a description
  - Output ends with 1-2 things the code does well
  - When specs/<slug>/ SDD artifacts cover the change, requirements compliance is reviewed first — intention vs implementation, not just tests passing
  - With SDD context the review opens with a Status of PASS or CHANGES REQUIRED
  - Nothing is reported as verified unless its command was actually run

# ─── Acceptance ──────────────────────────────────────────────────────────────
# Executable criteria. Consumed directly by evals/skills/review.eval.js — this
# is the single definition of "the skill works", not a copy of it.
acceptance:
  threshold: 0.8
  cases:
    - name: buggy user-controller
      fixture: buggy-code/user-controller.ts
      context: >-
        The file reviewed is user-controller.ts which contains SQL injection,
        null crash, missing auth, and error exposure bugs.
    - name: sdd requirements compliance
      fixture: sdd-project
      context: >-
        The project under review is an SDD feature: specs/feedback-voting/
        holds spec.md (acceptance criteria AC-01 toggle, AC-02 distinct count,
        AC-03 no self-votes) and tasks.md. The tasks for AC-01 and AC-02 are
        marked done, but the implementation in src/votes.js does not toggle
        (a second vote from the same user is added again, which also breaks
        the distinct count) — and it contains downvote and analytics code no
        acceptance criterion asks for. AC-03 is still unchecked.
      criteria:
        - Opens with a Status line whose value is CHANGES REQUIRED
        - Contains a Requirements compliance section comparing the implementation against the spec's acceptance criteria
        - Detects that the vote-toggle task (AC-01) is marked done but toggling is not implemented — a second vote from the same user is not removed
        - Flags the vote count as breaking AC-02, since duplicate votes from one user inflate it
        - Flags the downvote and/or analytics code as out of scope for the spec
        - Notes that AC-03 (self-vote rejection) is not implemented, without treating the unchecked task as a violation
        - Does not claim that tests or verifications passed without having run them
  criteria:
    - Identifies the SQL injection vulnerability (raw string interpolation in query)
    - Identifies the missing null check (user.profile.avatar crashes when profile is null)
    - Identifies the sensitive data exposure in the error handler (err object returned directly)
    - Identifies the missing authorization check (any user can read any other user's data)
    - Categorizes the SQL injection and missing auth check as Critical severity
    - Provides a concrete fix or code suggestion, not just a description of the problem
    - References specific line numbers or code snippets from the file as evidence

# ─── Context ─────────────────────────────────────────────────────────────────
# Commands whose output the skill needs. Each target renders these its own way:
# Claude Code executes them inline, Codex is told to run them, Antigravity gets
# prose (it has no inline shell execution).
context:
  - label: Branch diff (fallback when no file is given)
    command: git diff main..HEAD
  - label: Changed files
    command: git diff main..HEAD --name-only

# ─── Targets ─────────────────────────────────────────────────────────────────
targets:
  claude:
    frontmatter:
      context: fork
      agent: Explore
      allowed-tools: Read Grep Glob Bash(git *)
  antigravity: {}
  codex:
    extra_rules:
      - "This is a read-only review. Report findings; don't edit files unless the user asks."
---

# Skill: {{invoke}}

Reviews code with real engineering criteria. Not just style — detects bugs, security issues, and technical debt.

If `.ak/config.md` exists, read it first: it records the base branch this branch is diffed against, and the lint and typecheck commands whose output is evidence rather than opinion.

{{args_block}}

{{context}}

## When to use it

When the user writes {{invoke}} with a file path, or {{invoke}} on its own to review the current branch changes.

## Steps

1. **Read the code to review**:
   - If {{args}} names a file, read that file completely — ignore the branch diff.
   - If it is empty, use the branch diff above.

2. **Look for SDD context.** Check whether a `specs/<slug>/` directory covers
   this change — match the slug against the branch name or the changed paths.
   If one exists, read `spec.md` (the acceptance criteria), `plan.md`, and
   `tasks.md` before judging a single line. No `specs/` directory: skip to
   step 3, nothing changes.

   With SDD context, review **requirements compliance first** — the spec is
   the intention, the diff is the implementation, and your job is to compare
   the two rather than trust that passing tests mean the right thing was
   built:

   - Is every acceptance criterion the change claims to cover actually
     implemented — behavior, not just code that mentions it?
   - Is any task marked `[x]` in `tasks.md` whose implementation does not
     really satisfy its criterion?
   - Is there code the spec never asked for (out of scope)?
   - Which criteria have no test or `Verify:` coverage at all?

   An unchecked task that is unimplemented is remaining work, not a violation
   — only report it under compliance if something claims it is done.

3. **Review in this priority order**:

### {{sev:critical}} (blocks merge)
- Logic bugs that produce incorrect behavior
- Security vulnerabilities (injection, XSS, exposed data, auth bypass)
- Race conditions or concurrency issues
- Memory leaks or unreleased resources

### {{sev:important}} (must be resolved before or as follow-up)
- Missing or incomplete error handling
- Unconsidered edge cases
- Performance: N+1 queries, unnecessary loops, avoidable re-renders
- Missing tests for critical logic

### {{sev:suggestion}} (optional improvement)
- Unclear variable or function names
- Duplicated code that could be extracted
- Outdated or unnecessary comments
- Readability improvements

4. **Output format**:

```markdown
## Review: [file name or PR]

### {{sev:critical}}
- **Line X**: [problem description] → [fix suggestion]

### {{sev:important}}
- **Line X**: [description]

### {{sev:suggestion}}
- **Line X**: [description]

### {{sev:good}}
[Mention 1-2 things done well. Balanced feedback is more effective.]
```

   When SDD context was found in step 2, open the review with the compliance
   layer — the severity sections above follow unchanged below it:

```markdown
## Review: [feature slug]

Status: PASS | CHANGES REQUIRED

### Requirements compliance
- [AC-XX]: implemented / missing / diverges — [evidence]
- Tasks marked done without a matching implementation: [list or none]
- Out of scope: [code no criterion asks for, or none]

### Missing tests
- [criterion or behavior with no test]

### Verification gaps
- [criteria with no Verify coverage; verifications you did not run — say "not run", never assume PASS]
```

   `Status: PASS` only when every compliance point holds AND nothing Critical
   was found. Anything else is `CHANGES REQUIRED`.

## Rules

{{extra_rules}}
- Be specific: "line 42: this if never executes because..." is better than "there's a bug".
- Don't review style if a linter is configured — trust the tooling.
- If the file is very large (+500 lines), focus on new logic, not existing code.
- A review with 3 real criticals is worth more than 20 naming suggestions.
- Passing tests are evidence, not a verdict — compare what the spec intends
  with what the diff does; report only verifications that actually ran.
