# AI Workflow Kit — Evals

Two categories of tests: **deterministic** (hooks + CLI) and **LLM evals** (skill quality).

## Quick start

```bash
# Install deps
npm install

# Deterministic tests — hooks + CLI (no API key needed, ~15s)
npm test

# Skill evals — uses Claude API (requires ANTHROPIC_API_KEY)
ANTHROPIC_API_KEY=sk-... npm run eval

# Everything
ANTHROPIC_API_KEY=sk-... npm run test:all
```

## Structure

```
evals/
  hooks/                  # Vitest tests for the 5 shell hook scripts
    pre-bash-safety.test.js       — 25 cases: blocked/warned/allowed commands
    pre-commit-secrets.test.js    — 12 cases: detected secrets vs. safe files
    post-write-format.test.js     — 20 cases: formattable vs. skipped extensions
    post-edit-lint.test.js        — 17 cases: linted vs. skipped files
  cli/
    cli.test.js           — 21 cases: --list, --skills, --hooks, --uninstall, settings merge
  skills/
    commit.eval.js        — /commit: Conventional Commits format on known diffs
    review.eval.js        — /review: finds planted bugs in user-controller.ts
    vibe-audit.eval.js    — /vibe-audit: detects >=80% of 14 planted problems
  utils/
    run-hook.js           — executes a hook script with JSON stdin
    llm-judge.js          — evaluates LLM output against a rubric using Claude Haiku
  fixtures/
    vulnerable-app/       — Express app + React frontend with 14 planted problems
    sample-diffs/         — known diffs for /commit eval (feat, fix)
    buggy-code/           — TypeScript file with 5 planted bugs for /review eval
  run-evals.js            — runs all 3 skill evals and prints summary
```

## Deterministic tests (95 tests, ~15s)

These test the shell scripts and Node CLI with real subprocess calls — no mocking.

| Suite | Tests | What it covers |
|---|---|---|
| pre-bash-safety | 25 | 7 blocked, 7 warned, 2 secret-detected, 9 safe |
| pre-commit-secrets | 12 | 7 blocked (various secret types), 5 allowed (clean/exempt) |
| post-write-format | 20 | 10 formattable extensions, 8 skipped, 2 empty input |
| post-edit-lint | 17 | 4 lintable, 5 config files skipped, 6 non-JS skipped, 2 empty |
| CLI installer | 21 | --list, --skills, --hooks, --yes, --uninstall, settings merge |

## LLM evals (3 evals, ~30s, requires API key)

Each eval calls Claude Haiku with the skill prompt + a controlled fixture, then uses an LLM judge to score the output against a rubric. Passing threshold: **80% of rubric criteria**.

| Eval | Model | Rubric criteria | Fixture |
|---|---|---|---|
| `/commit` | Haiku | 5 (type, length, mood, accuracy, relevance) | 2 known diffs |
| `/review` | Haiku | 7 (finds SQL injection, null crash, missing auth, error exposure, severity, fix, evidence) | user-controller.ts |
| `/vibe-audit` | Haiku | 12 (detects 9 specific vulnerabilities + format + evidence + no false positives) | vulnerable-app/ |

## Fixtures

### `fixtures/vulnerable-app/`
Express + React app with 14 planted problems (see `PLANTED_PROBLEMS.md`):
- 9 Critical: hardcoded secrets, open CORS, no admin auth, plain-text passwords, IDOR, JWT without expiry, stack trace exposure, XSS via dangerouslySetInnerHTML
- 5 Important: no rate limiting, no input validation, no pagination, console.log leaks, no loading states

### `fixtures/buggy-code/user-controller.ts`
TypeScript controller with 5 planted bugs:
1. SQL injection (raw string concatenation)
2. Null crash (missing optional chain)
3. Missing authorization check
4. Sensitive data in error response
5. No input validation on role update

### `fixtures/sample-diffs/`
Two git diffs for `/commit` eval:
- `feat-login-form.diff` — new LoginForm component + auth service
- `fix-null-check.diff` — null guard + optional chaining fixes
