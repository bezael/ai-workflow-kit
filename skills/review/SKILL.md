---
name: ak:review
description: Review code with real engineering criteria — logic bugs, security vulnerabilities, and technical debt. Use when the user says /review, asks for a code review, or wants the branch diff checked before opening a PR.
argument-hint: "[file path, or leave empty for the branch diff]"
context: fork
agent: Explore
allowed-tools: Read Grep Glob Bash(git *)
---

# Skill: /ak:review

Reviews code with real engineering criteria. Not just style — detects bugs, security issues, and technical debt.

If `.ak/config.md` exists, read it first: it records the base branch this branch is diffed against, and the lint and typecheck commands whose output is evidence rather than opinion.

## Target

$ARGUMENTS

## Context

- Branch diff (fallback when no file is given): !`git diff main..HEAD`
- Changed files: !`git diff main..HEAD --name-only`

## When to use it

When the user writes /ak:review with a file path, or /ak:review on its own to review the current branch changes.

## Steps

1. **Read the code to review**:
   - If $ARGUMENTS names a file, read that file completely — ignore the branch diff.
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

### 🔴 Critical (blocks merge)
- Logic bugs that produce incorrect behavior
- Security vulnerabilities (injection, XSS, exposed data, auth bypass)
- Race conditions or concurrency issues
- Memory leaks or unreleased resources

### 🟡 Important (must be resolved before or as follow-up)
- Missing or incomplete error handling
- Unconsidered edge cases
- Performance: N+1 queries, unnecessary loops, avoidable re-renders
- Missing tests for critical logic

### 🔵 Suggestion (optional improvement)
- Unclear variable or function names
- Duplicated code that could be extracted
- Outdated or unnecessary comments
- Readability improvements

4. **Output format**:

```markdown
## Review: [file name or PR]

### 🔴 Critical
- **Line X**: [problem description] → [fix suggestion]

### 🟡 Important
- **Line X**: [description]

### 🔵 Suggestion
- **Line X**: [description]

### ✅ What's good
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

- Be specific: "line 42: this if never executes because..." is better than "there's a bug".
- Don't review style if a linter is configured — trust the tooling.
- If the file is very large (+500 lines), focus on new logic, not existing code.
- A review with 3 real criticals is worth more than 20 naming suggestions.
- Passing tests are evidence, not a verdict — compare what the spec intends
  with what the diff does; report only verifications that actually ran.
