---
id: review
name: review
description: >-
  Review code with real engineering criteria — logic bugs, security
  vulnerabilities, and technical debt. Use when the user says /ak-review, asks for
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
  - With SDD context the compliance layer closes with a PR-issue alignment verdict: Exact, Tangling, Missing, or Missing and Tangling
  - Nothing is reported as verified unless its command was actually run
  - Review depth is prioritized by the churn / fix-history risk signal (npx ai-workflow-kit risk) when git history is available; the signal orders the review and is never itself a finding
  - A review that surfaces a durable learning (decision confirmed or overturned, alternative rejected, risk materialized) offers to persist it to memory/

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
        - States an alignment verdict of Missing and Tangling — or at minimum names both deviations, missing work and out-of-scope code, as alignment failures
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

   Close the compliance layer with an **alignment verdict** — the PR-issue
   alignment taxonomy from agentic code review research (Isik et al.):

   - **Exact** — the change covers the requirements, nothing unrelated.
   - **Tangling** — the change includes code no criterion asks for.
   - **Missing** — the change fails to fully cover the requirements.
   - **Missing and Tangling** — both at once.

   Tangling code is noise that hides defects; Missing work is technical debt
   wearing a green checkmark. Name the deviation and its evidence.

3. **Prioritize with the risk signal.** Run `npx ai-workflow-kit risk` — it
   ranks the changed files by churn and fix history from git, the two
   strongest deterministic predictors of where defects cluster. Start the
   deep review at the `HIGH` files. If `npx` is unavailable, approximate it:
   `git log --since="6 months ago" --oneline -- <file>` per changed file, and
   weigh files with many `fix:` commits heaviest. Two rules:

   - A file with no history is **new code — unknown risk, not low risk**.
   - The signal decides where review depth goes first; it is **never itself
     a finding**. A `HIGH` label with no defect found is a clean result.

   Sensitive paths join the top of the queue. If `.ak/config.md` has a
   `## Review` section with `- Sensitive paths:` (auth, billing, migrations —
   whatever `/ak-setup` recorded), every changed file matching one of those
   globs starts the deep review alongside the `HIGH` files, whatever its
   history says: a quiet `src/auth/` file is quiet, not safe. `npx
   ai-workflow-kit risk --focus` already folds them in as HIGH review need
   with the matched glob as the reason.

4. **Review in this priority order**:

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

5. **Output format**:

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
Alignment: Exact | Tangling | Missing | Missing and Tangling

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
   was found. Anything else is `CHANGES REQUIRED`. An alignment verdict other
   than `Exact` cannot be `PASS` unless the user explicitly accepted the
   deviation — out-of-scope code gets removed or specced, missing work gets
   completed or descoped in writing.

6. **Close the loop.** A review is not finished when the findings are written
   — it is finished when the durable part of what it taught lives somewhere
   the next session will read. If the review surfaced a durable learning:

   - a decision confirmed or overturned,
   - an alternative considered and rejected, with the reason,
   - a risk that materialized (or was confirmed absent) in a specific module,

   offer to persist it to `memory/decisions/` (the memory skill's `save`
   flow). Pure code fixes stay in the review; only durable knowledge is
   promoted. A review whose lessons evaporate forces the next review to
   rediscover them.

## Rules

{{extra_rules}}
- Be specific: "line 42: this if never executes because..." is better than "there's a bug".
- Don't review style if a linter is configured — trust the tooling.
- If the file is very large (+500 lines), focus on new logic, not existing code.
- A review with 3 real criticals is worth more than 20 naming suggestions.
- Passing tests are evidence, not a verdict — compare what the spec intends
  with what the diff does; report only verifications that actually ran.
