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

2. **Review in this priority order**:

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

3. **Output format**:

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

## Rules

- Be specific: "line 42: this if never executes because..." is better than "there's a bug".
- Don't review style if a linter is configured — trust the tooling.
- If the file is very large (+500 lines), focus on new logic, not existing code.
- A review with 3 real criticals is worth more than 20 naming suggestions.
