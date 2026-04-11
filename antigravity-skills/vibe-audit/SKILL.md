# Skill: vibe-audit

Audit of apps built with vibe coding. Detects typical problems AI generated without anyone reviewing them: security, performance, maintainability, and accumulated technical debt.

## Trigger

When the user writes `@vibe-audit` or `@vibe-audit folder`.
Also useful when someone says "I generated this with AI and want to know how bad it is".

## Steps

1. Scan the complete project structure (folders, main files)
2. Read the most critical files: entry point, routes/endpoints, main components, config
3. Look for the most common risk patterns in vibe-coded apps
4. Generate a report with severity, concrete evidence, and suggested fix

## Key patterns to detect

### Critical (security risk or blocks production)
- Hardcoded secrets and API keys in code
- No input validation on API endpoints
- CORS open to everyone (`origin: '*'`)
- No authentication on protected routes
- IDOR — access to other users' resources without ownership check
- Passwords without hashing (or using MD5/SHA1)
- XSS via innerHTML / dangerouslySetInnerHTML without sanitization
- JWT tokens without expiration (`expiresIn`)
- Stack traces exposed to the client

### Important (affect stability or maintainability)
- Development console.logs in production
- Giant components (God Components) — 500+ lines
- No loading or error states in frontend
- Queries without pagination (`findMany()` without `take`/`limit`)
- Third-party APIs without rate limiting
- No async error handling (`async/await` without `try/catch`)

### Improvements (technical debt)
- No environment variables for configuration (hardcoded ports, URLs, DB names)
- No security headers (Helmet missing in Express)
- Dependencies with known vulnerabilities (`npm audit`)
- node_modules or /dist committed to git
- Unoptimized bundle (full lodash imports, no lazy loading)

## Report format

```markdown
# Vibe Audit — [project name]
Audited: [date]

## Summary
- Critical: N  (block production or are security risks)
- Important: N (affect stability or maintainability)
- Improvements: N (technical debt, quality)

---

## Critical

### [Problem name]
**Where:** `path/file.ts` line X
**Evidence:**
[problematic code]
**Risk:** [what can happen if not fixed]
**Suggested fix:**
[corrected code or concrete steps]

---

## Important
[same format]

---

## Improvements
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

- Be specific: cite the file and line, don't say "there's a security problem" without showing where.
- One problem at a time if the user wants to fix them: don't generate 50 fixes at once. Offer to fix them in priority order.
- Don't rewrite the app: the goal is to identify and fix existing problems, not redo everything with "best practices".
- If the project is large: audit by module (auth, API, frontend) instead of everything at once.
