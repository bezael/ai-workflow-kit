---
id: vibe-audit
name: vibe-audit
description: >-
  Audit AI-generated apps for security, performance, and maintainability
  issues. Use when user says /vibe-audit or "I generated this with AI and want
  to know how bad it is".
argument-hint: "[folder path, or leave empty for the current project]"

assets:
  - patterns.md

contract:
  - Findings are grouped Critical / Important / Improvements with a count per group
  - Every finding names the file and line where the problem lives
  - Every finding states the concrete risk and a suggested fix
  - Report ends with an ordered action plan, most urgent first
  - Nothing is reported that is not actually in the code

acceptance:
  threshold: 0.8
  cases:
    - name: vulnerable-app
      fixture: vulnerable-app/
      context: >-
        The app has these planted problems: hardcoded secrets, open CORS, no
        admin auth, plain-text passwords, IDOR, JWT without expiry, stack trace
        exposure, XSS via dangerouslySetInnerHTML, no rate limiting on AI endpoint.
  criteria:
    - Detects hardcoded secrets (OPENAI_API_KEY or DB_PASSWORD in server.js)
    - Detects CORS open to all origins (cors() with no config in server.js)
    - Detects missing authentication on /admin routes
    - Detects password stored in plain text (no hashing in /auth/register)
    - Detects IDOR vulnerability (no ownership check in /api/orders/:id)
    - Detects JWT without expiration (jwt.sign without expiresIn)
    - Detects stack trace exposed to client in the error handler
    - Detects XSS via dangerouslySetInnerHTML in frontend.jsx
    - Detects missing rate limiting on the /api/generate OpenAI endpoint
    - Uses structured severity format (Critical/Important or 🔴/🟡 categories)
    - References specific file names or line numbers as evidence (not vague descriptions)
    - Does NOT invent critical problems that are not in the code

targets:
  claude:
    frontmatter:
      disable-model-invocation: true
      context: fork
      agent: Explore
    patterns_ref: "[patterns.md](patterns.md)"
  antigravity:
    patterns_ref: "`patterns.md`, next to this skill"
  codex:
    patterns_ref: >-
      `~/.codex/ak-workflow-kit/vibe-audit-patterns.md` (or
      `$CODEX_HOME/ak-workflow-kit/vibe-audit-patterns.md` if `CODEX_HOME` is set)
---

# Skill: {{invoke}}

Audit of apps built with vibe coding. Detects the typical problems AI generated without anyone reviewing them: security, performance, maintainability, and accumulated technical debt.

## Target

{{args}}

If **Target** is empty, audit the current project root. If a folder path is provided, scope the audit to that folder only.

## When to use it

When the user writes {{invoke}} on its own, or with a folder path.
Also useful when someone says "I generated this with AI and want to know how bad it is".

## What this skill does first

1. Scans the complete project structure (folders, main files) starting from **Target**
2. Reads the most critical files: entry point, routes/endpoints, main components, config
3. Checks each of the 20 risk patterns documented in {{patterns_ref}} — load it before starting
4. Generates a report with severity, concrete evidence, and suggested fix

---

## Report format

```markdown
# Vibe Audit — [project name]
Audited: [date]

## Summary
- {{sev:critical}}: N  (block production or are security risks)
- {{sev:important}}: N (affect stability or maintainability)
- {{sev:improvement}}: N    (technical debt, quality)

---

## {{sev:critical}}

### [Problem name]
**Where:** `path/file.ts` line X
**Evidence:**
[problematic code]
**Risk:** [what can happen if not fixed]
**Suggested fix:**
[corrected code or concrete steps]

---

## {{sev:important}}
[same format]

---

## {{sev:improvement}}
[same format]

---

## What's good
[1-3 things vibe coding did well — balanced feedback is more actionable]

## Suggested action plan
1. [This first — the most urgent critical]
2. [Then this]
3. [...]
```

## Rules

- **Be specific**: cite the file and line, don't say "there's a security problem" without showing where.
- **One problem at a time if the user wants to fix them**: don't generate 50 fixes at once. Offer to fix them in priority order.
- **Don't rewrite the app**: the goal is to identify and fix existing problems, not redo everything with "best practices".
- **If the project is large**: audit by module (auth, API, frontend) instead of everything at once.
