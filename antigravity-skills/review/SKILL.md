---
name: review
description: Review code with real engineering criteria — logic bugs, security vulnerabilities, and technical debt. Use when the user says /review, asks for a code review, or wants the branch diff checked before opening a PR.
---

# Skill: @review

Reviews code with real engineering criteria. Not just style — detects bugs, security issues, and technical debt.

If `.ak/config.md` exists, read it first: it records the base branch this branch is diffed against, and the lint and typecheck commands whose output is evidence rather than opinion.

## Context to gather first

Run these and read the output before starting:

```bash
git diff main..HEAD   # Branch diff (fallback when no file is given)
git diff main..HEAD --name-only   # Changed files
```

## When to use it

When the user writes @review with a file path, or @review on its own to review the current branch changes.

## Steps

1. **Read the code to review**:
   - If the path the user gave names a file, read that file completely — ignore the branch diff.
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

4. **Review in this priority order**:

### Critical (blocks merge)
- Logic bugs that produce incorrect behavior
- Security vulnerabilities (injection, XSS, exposed data, auth bypass)
- Race conditions or concurrency issues
- Memory leaks or unreleased resources

### Important (must be resolved before or as follow-up)
- Missing or incomplete error handling
- Unconsidered edge cases
- Performance: N+1 queries, unnecessary loops, avoidable re-renders
- Missing tests for critical logic

### Suggestion (optional improvement)
- Unclear variable or function names
- Duplicated code that could be extracted
- Outdated or unnecessary comments
- Readability improvements

5. **Output format**:

```markdown
## Review: [file name or PR]

### Critical
- **Line X**: [problem description] → [fix suggestion]

### Important
- **Line X**: [description]

### Suggestion
- **Line X**: [description]

### What's good
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

- Be specific: "line 42: this if never executes because..." is better than "there's a bug".
- Don't review style if a linter is configured — trust the tooling.
- If the file is very large (+500 lines), focus on new logic, not existing code.
- A review with 3 real criticals is worth more than 20 naming suggestions.
- Passing tests are evidence, not a verdict — compare what the spec intends
  with what the diff does; report only verifications that actually ran.
