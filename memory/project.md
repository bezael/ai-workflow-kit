# Memory: Project

Architecture decisions, stack context, and accumulated project knowledge.

---

## Stack and conventions

<!-- Document the real project stack here.
Example:
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Node.js / Express
- Database: PostgreSQL + Prisma ORM
- Tests: Vitest + Testing Library
- CI/CD: GitHub Actions
- Deploy: Vercel (frontend) / Railway (backend)
-->

## Architecture decisions

<!-- Format:
### YYYY-MM-DD — [Decision title]
**Decision:** What was decided.
**Why:** The reason — constraint, trade-off, team preference.
**Alternatives considered:** What was evaluated and rejected.
**Still valid?** Yes / Review after [date or event]
-->

## Business context

<!-- Domain knowledge the AI needs to make better decisions.
Example:
- "Order" always means a confirmed purchase, not a cart
- Users can have multiple roles simultaneously
- Free tier is limited to 3 projects, paid has no limit
-->

## What NOT to do

<!-- Hard-won negative learnings.
Example:
### 2026-03-10 — Don't use optimistic updates on payment flows
Caused a bug where UI showed success but payment failed silently.
Use pessimistic updates (wait for server confirmation) on anything money-related.
-->
