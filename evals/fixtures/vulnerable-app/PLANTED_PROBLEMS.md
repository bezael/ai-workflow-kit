# Planted problems in vulnerable-app fixture

Used by `evals/skills/vibe-audit.eval.js`.
The eval expects `/vibe-audit` to detect >= 8 of these 10 problems.

| # | Severity | Problem | File | Line |
|---|---|---|---|---|
| 1 | 🔴 | Hardcoded API key (OPENAI_API_KEY) | server.js | ~14 |
| 2 | 🔴 | Hardcoded DB password | server.js | ~12 |
| 3 | 🔴 | CORS open to everyone (`cors()` no config) | server.js | ~20 |
| 4 | 🔴 | No authentication on /admin routes | server.js | ~51-58 |
| 5 | 🔴 | Password stored in plain text | server.js | ~35 |
| 6 | 🔴 | IDOR — no ownership check on /api/orders/:id | server.js | ~72 |
| 7 | 🔴 | JWT without expiration | server.js | ~46 |
| 8 | 🔴 | Stack trace exposed to client | server.js | ~90 |
| 9 | 🔴 | XSS via dangerouslySetInnerHTML (unsanitized) | frontend.jsx | ~9 |
| 10 | 🟡 | No rate limiting on /api/generate (OpenAI calls) | server.js | ~79 |
| 11 | 🟡 | No input validation on /auth/register | server.js | ~33 |
| 12 | 🟡 | No pagination on /api/orders | server.js | ~76 |
| 13 | 🟡 | console.log with sensitive data | server.js | ~18 |
| 14 | 🟡 | No loading/error states in UserProfile | frontend.jsx | ~19 |
