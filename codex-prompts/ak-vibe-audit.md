---
description: Audit AI-generated apps for security, performance, and maintainability issues — the typical vibe coding problems nobody reviewed.
argument-hint: "[path/to/folder or leave empty for current project]"
---

# /ak-vibe-audit

Audit of apps built with vibe coding. Detects the typical problems AI generated without anyone reviewing them: security, performance, maintainability, and accumulated technical debt.

## Target

$ARGUMENTS

If **Target** is empty, audit the current project root. If a folder path is provided, scope the audit to that folder only.

## What to do first

1. Scan the complete project structure (folders, main files) starting from **Target**
2. Read the most critical files: entry point, routes/endpoints, main components, config
3. **Load the full pattern reference**: read `~/.codex/ak-workflow-kit/vibe-audit-patterns.md`
   (or `$CODEX_HOME/ak-workflow-kit/vibe-audit-patterns.md` if `CODEX_HOME` is set).
   It has the detection snippet, the risk, and the fix for each of the 20 patterns.
   If that file is missing, fall back to the checklist below.
4. Generate a report with severity, concrete evidence, and suggested fix

## Checklist (fallback — the reference file has the details)

🔴 **Critical**
1. Hardcoded secrets — API keys, passwords, DB URLs in code
2. No input validation on APIs — blindly trusting `req.body`
3. CORS open to everyone — `origin: '*'` shipped to production
4. No authentication on protected routes — missing auth middleware
12. IDOR — `/api/orders/:id` without checking the resource belongs to the caller
13. Passwords without hashing — plain text or MD5/SHA1
14. XSS via `innerHTML` / `dangerouslySetInnerHTML` without sanitizing
15. JWT without expiration — `jwt.sign()` with no `expiresIn`
16. Stack traces exposed to client — `res.json({ error: err.stack })`

🟡 **Important**
5. Development `console.log`s in production
6. God Components — 500+ lines mixing state, fetch, UI, and business logic
7. No loading or error states in frontend — only the happy path
8. Queries without pagination — `SELECT *` / `find({})` with no limit
9. Third-party APIs without rate limiting — unbounded OpenAI/Stripe/Twilio calls
17. No security headers — Express app without `helmet()`
18. Dependencies with known vulnerabilities — check `npm audit`
19. `node_modules` or `/dist` committed — check `git ls-files`

🔵 **Improvements**
10. No environment variables for configuration — hardcoded ports and URLs
11. No async error handling — `async/await` with no `try/catch`
20. Unoptimized bundle — full library imports, no lazy loading, heavy images

---

## Report format

```markdown
# Vibe Audit — [project name]
Audited: [date]

## Summary
- 🔴 Critical: N  (block production or are security risks)
- 🟡 Important: N (affect stability or maintainability)
- 🔵 Improvements: N    (technical debt, quality)

---

## 🔴 Critical

### [Problem name]
**Where:** `path/file.ts` line X
**Evidence:**
[problematic code]
**Risk:** [what can happen if not fixed]
**Suggested fix:**
[corrected code or concrete steps]

---

## 🟡 Important
[same format]

---

## 🔵 Improvements
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
