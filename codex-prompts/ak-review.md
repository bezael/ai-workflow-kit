---
description: Review code with real engineering criteria — logic bugs, security vulnerabilities, and technical debt.
argument-hint: "[path/to/file or leave empty for branch diff]"
---

# /ak-review

Reviews code with real engineering criteria. Not just style — detects bugs, security issues, and technical debt.

Target: $ARGUMENTS

## Steps

1. **Read the code to review**:
   - If a file path was provided above, read that file completely — ignore the branch diff.
   - If nothing was provided, gather the diff yourself:
     ```bash
     git diff main..HEAD             # changes to review
     git diff main..HEAD --name-only # changed files
     ```
     Substitute the real base branch if it isn't `main`.

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

- This is a read-only review. Report findings; don't edit files unless the user asks.
- Be specific: "line 42: this if never executes because..." is better than "there's a bug".
- Don't review style if a linter is configured — trust the tooling.
- If the file is very large (+500 lines), focus on new logic, not existing code.
- A review with 3 real criticals is worth more than 20 naming suggestions.
