---
name: ak:review
description: Review code with real engineering criteria — logic bugs, security vulnerabilities, and technical debt. Use when user says /review @file or /review to review current PR changes.
argument-hint: [@file or leave empty for PR diff]
context: fork
agent: Explore
allowed-tools: Read Grep Glob Bash(git *)
---

# Skill: /review

Reviews code with real engineering criteria. Not just style — detects bugs, security issues, and technical debt.

## Context

- Target: $ARGUMENTS
- PR diff (fallback if no file provided): !`git diff main..HEAD`
- Changed files: !`git diff main..HEAD --name-only`

## When to use it

When the user writes `/review @file` or `/review` (reviews current PR changes).

## Steps

1. **Read the code to review**:
   - If `$ARGUMENTS` contains a file path, read that file completely — ignore the PR diff.
   - If `$ARGUMENTS` is empty, use the **PR diff** already loaded above.

2. **Review in this priority order**:

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

3. **Output format**:

```markdown
## Review: [file name or PR]

### 🔴 Critical
- **Line X**: [problem description] → [fix suggestion]

### 🟡 Important
- **Line X**: [description]

### 🔵 Suggestions
- **Line X**: [description]

### ✅ What's good
[Mention 1-2 things done well. Balanced feedback is more effective.]
```

## Rules

- Be specific: "line 42: this if never executes because..." is better than "there's a bug".
- Don't review style if a linter is configured — trust the tooling.
- If the file is very large (+500 lines), focus on new logic, not existing code.
- A review with 3 real criticals is worth more than 20 naming suggestions.
