# AI Workflow Kit

![AI Workflow Kit](./banner.png)

Skills, agents, and hooks for working with AI coding tools consistently and professionally.
Works with **Claude Code**, **Cursor**, **GitHub Copilot**, and **Google Antigravity**.

## Getting started in 60 seconds

```bash
# 1. Install
npx ai-workflow-kit

# 2. Restart Claude Code (or your AI tool)

# 3. Run your first skill
/ak:commit
```

That's it. You now have structured commit messages, PR descriptions, code review, debugging workflows, and more — all from your editor.

## Installation

```bash
npx ai-workflow-kit
```

Or pin a specific version as a dev dependency (it's a dev tool, not a runtime dependency):

```bash
npm i -D ai-workflow-kit@2.2.0-beta.1
npx ai-workflow-kit
```

Restart Claude Code. You'll have `/ak:commit`, `/ak:pr`, `/ak:plan`, `/ak:debug`, `/ak:review`, `/ak:vibe-audit`, `/ak:frontend`, `/ak:api`, `/ak:test`, `/ak:refactor`, and `/ak:docs` available — plus 5 automatic hooks.

```bash
npx ai-workflow-kit --global   # install into ~/.claude/ — all projects (default)
npx ai-workflow-kit --local    # install into .claude/ — this project only
npx ai-workflow-kit --skills   # skills and agents only
npx ai-workflow-kit --hooks    # hooks only
npx ai-workflow-kit --yes      # no confirmations
npx ai-workflow-kit --list     # see what would be installed
npx ai-workflow-kit --uninstall
```

Or manually:

```bash
cp -r skills/* ~/.claude/skills/
cp -r agents/* ~/.claude/skills/
cp -r hooks/*.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh
```

## Structure

```
ai-workflow-kit/
├── CLAUDE.md                        # Instructions for Claude Code
├── GEMINI.md                        # Instructions for Google Antigravity
├── AGENTS.md                        # Cross-tool rules (all AI tools)
├── .cursorrules                     # Rules for Cursor
├── .github/
│   └── copilot-instructions.md     # Instructions for GitHub Copilot
├── antigravity-skills/
│   ├── commit/SKILL.md             # @commit — generates semantic commit messages
│   ├── pr/SKILL.md                 # @pr — creates PRs with full description
│   ├── review/SKILL.md             # @review — reviews code with real criteria
│   ├── plan/SKILL.md               # @plan — plans before executing
│   ├── debug/SKILL.md              # @debug — structured debugging workflow
│   ├── vibe-audit/SKILL.md         # @vibe-audit — audits vibe-coded apps
│   ├── frontend/SKILL.md           # @frontend — generates UI components
│   ├── api/SKILL.md                # @api — generates endpoints with validation
│   ├── test/SKILL.md               # @test — writes behavior-driven tests
│   ├── refactor/SKILL.md           # @refactor — improves code without breaking anything
│   └── docs/SKILL.md               # @docs — JSDoc, README, ADR
├── skills/
│   ├── commit.md                   # /ak:commit — generates semantic commit messages
│   ├── pr.md                       # /ak:pr — creates PRs with full description
│   ├── review.md                   # /ak:review — reviews code with real engineering criteria
│   ├── plan.md                     # /ak:plan — plans before executing
│   └── debug.md                    # /ak:debug — structured debugging workflow
├── agents/
│   ├── frontend.md                 # /ak:frontend — generates UI components
│   ├── api.md                      # /ak:api — generates endpoints with validation
│   ├── test.md                     # /ak:test — writes behavior-driven tests
│   ├── refactor.md                 # /ak:refactor — improves code without breaking anything
│   └── docs.md                     # /ak:docs — JSDoc, README, ADR
├── hooks/
│   ├── README.md                   # How to install and customize hooks
│   ├── settings.template.json      # Ready-to-copy configuration
│   ├── pre-bash-safety.sh          # Blocks destructive commands
│   ├── pre-commit-secrets.sh       # Detects API keys before committing
│   ├── post-write-format.sh        # Auto-formats with Prettier/Biome
│   ├── post-edit-lint.sh           # Lints after each edit
│   └── notify-done.sh              # Desktop notification when Claude finishes
└── memory/
    └── project.md                  # Persistent project memory
```

## Available Skills

| Skill | Command | What it does |
|-------|---------|--------------|
| [commit](./antigravity-skills/commit/SKILL.md) | `/ak:commit` | Reads the real diff and generates a semantic commit message |
| [pr](./antigravity-skills/pr/SKILL.md) | `/ak:pr` | Creates PR with description, test plan, and checklist |
| [review](./antigravity-skills/review/SKILL.md) | `/ak:review @file` | Reviews code: bugs, security, performance |
| [plan](./antigravity-skills/plan/SKILL.md) | `/ak:plan [task]` | Plans before executing complex tasks |
| [debug](./antigravity-skills/debug/SKILL.md) | `/ak:debug [problem]` | Diagnoses with hypotheses before proposing fixes |
| [vibe-audit](./antigravity-skills/vibe-audit/SKILL.md) | `/ak:vibe-audit` | Full audit of apps generated with vibe coding |

## Specialized Agents

| Agent | Command | What it does |
|-------|---------|--------------|
| [frontend](./agents/frontend/) | `/ak:frontend [description]` | Generates components following the project's design system |
| [api](./agents/api/) | `/ak:api [description]` | Generates endpoints with validation, auth, and error handling |
| [test](./agents/test/) | `/ak:test @file` | Writes tests by behavior, not by implementation |
| [refactor](./agents/refactor/) | `/ak:refactor @file` | Improves code without changing behavior |
| [docs](./agents/docs/) | `/ak:docs @file` | Generates JSDoc, README, or ADR as needed |

## Real output examples

<details>
<summary><strong>/ak:commit</strong> — semantic commit from real diff</summary>

```
$ /ak:commit

Reading staged diff...

Suggested commit message:

  feat(auth): add JWT refresh token rotation

  - Generates new refresh token on every use (prevents replay attacks)
  - Old token is invalidated immediately after rotation
  - Adds 7-day expiry and httpOnly cookie storage

Proceed? [Y/n]
```

</details>

<details>
<summary><strong>/ak:plan</strong> — plan before touching code</summary>

```
$ /ak:plan add rate limiting to the API

## Plan: add rate limiting to the API

### Goal
Protect all public endpoints from abuse using per-IP sliding window limits.

### Files to be touched
- `src/middleware/rateLimiter.ts` — [new] sliding window implementation
- `src/app.ts` — register middleware globally before route handlers
- `src/config/limits.ts` — [new] per-route limit constants
- `tests/middleware/rateLimiter.test.ts` — [new] behavior tests

### Steps in order
1. Install `rate-limiter-flexible` (Redis-backed, production-safe)
2. Create `rateLimiter.ts` with 100 req/min default, 10 req/min for /auth/*
3. Mount middleware in `app.ts` before all routes
4. Add tests for limit exceeded (429), limit reset, and exempted routes

### Risks / decisions
- Redis required in prod — fallback to in-memory for local dev
- Auth routes use stricter limits to slow brute-force attempts

Approve this plan? [Y/n]
```

</details>

<details>
<summary><strong>/ak:debug</strong> — structured diagnosis</summary>

```
$ /ak:debug POST /api/orders returns 500 only on the second request

Reading error logs and relevant files...

## Hypotheses (ranked by likelihood)

1. **Database connection not released after first request** (HIGH)
   - `db.connect()` called inside handler without `finally` block
   - Second request hits max pool size → timeout → 500
   - Check: `src/handlers/orders.ts:34`

2. **Singleton state mutated on first request** (MEDIUM)
   - Shared `orderService` instance accumulates state
   - Check: `src/services/OrderService.ts:12`

3. **Missing await on async middleware** (LOW)
   - Unlikely given the pattern but worth ruling out

Recommended first step: add `finally { db.release() }` in orders handler.
Reproduce with: `for i in 1 2; do curl -X POST localhost:3000/api/orders; done`
```

</details>

<details>
<summary><strong>/ak:review</strong> — real engineering criteria</summary>

```
$ /ak:review @src/services/PaymentService.ts

Reviewing src/services/PaymentService.ts...

## Issues found

### CRITICAL
- **Line 47**: Stripe secret key read from `process.env` inside a loop — 
  rotated keys will silently use stale values until process restart.
  Fix: read once at module init.

### HIGH
- **Line 89**: `catch (e) {}` swallows all payment errors.
  Silent failures mean charged customers with no order created.

### MEDIUM
- **Line 112**: `amount` cast to `Number()` without validation —
  NaN silently passed to Stripe, which returns a 400 that's also swallowed (see above).

### LOW
- **Line 23**: Redundant `async` on a function that never awaits.

No security vulnerabilities found beyond those listed above.
```

</details>

<details>
<summary><strong>/ak:pr</strong> — PR with full description</summary>

```
$ /ak:pr feat: add CSV export to reports

## feat: add CSV export to reports

### Summary
- Adds a CSV download button to the reports dashboard
- Streams large datasets (>10k rows) to avoid memory spikes
- Respects the existing date range and filter state

### Test plan
- [ ] Download CSV with 0, 1, and 10,000 rows
- [ ] Verify column headers match table display
- [ ] Confirm filters are applied in the export (not raw data)
- [ ] Test with special characters in data (commas, quotes, newlines)

### Notes
Uses `fast-csv` (already in deps). No schema changes.

Ready to open PR? [Y/n]
```

</details>

<details>
<summary><strong>/ak:vibe-audit</strong> — audit of AI-generated app</summary>

```
$ /ak:vibe-audit

Scanning project for vibe-coding patterns...

## Audit Report

### Security (3 issues)
- CRITICAL: API keys hardcoded in `src/lib/openai.ts:8`
- HIGH: No input validation on user-supplied file paths (`/api/export`)
- MEDIUM: CORS set to `*` in `server.ts` — restrict to known origins

### Error handling (2 issues)
- Missing error boundary in `app/dashboard/page.tsx`
- Unhandled promise rejection in `hooks/useData.ts:34`

### Code quality (4 issues)
- 3 unused imports across 3 files
- `any` type used 11 times — replace with real types

### Tests
- 0 test files found. Add tests before shipping.

Fix the 2 critical/high issues before deploying to production.
```

</details>

## Available Hooks

Hooks run **automatically** — no activation needed from the dev.

| Hook | Event | What it does |
|------|-------|--------------|
| `pre-bash-safety` | Before Bash | Blocks `rm -rf /`, force push, drop table, etc. |
| `pre-commit-secrets` | Before `git commit` | Scans staged files for API keys and tokens |
| `post-write-format` | After Write/Edit | Formats with Prettier or Biome automatically |
| `post-edit-lint` | After Edit | Runs ESLint and returns errors to Claude |
| `notify-done` | When Claude finishes | Desktop notification (Mac/Linux/Windows) |

See `hooks/README.md` for installation instructions.

## How to Use with Claude Code

### Install the skills

```bash
# Copy skills to Claude Code
cp skills/*.md ~/.claude/skills/
```

### Use in any project

Add to your project's `CLAUDE.md`:

```markdown
## Available Skills
See ~/.claude/skills/ for the full list.
Project memory at memory/project.md.
```

### Use with Cursor

The rules in `.cursorrules` apply automatically. Copy the file to your project root.

### Use with GitHub Copilot

The `.github/copilot-instructions.md` file is used automatically in GitHub repos.

### Use with Google Antigravity

Copy `GEMINI.md` and `AGENTS.md` to your project root. The installer copies skills to `~/.gemini/antigravity/skills/` automatically.

```bash
# Copy project rules
cp GEMINI.md your-project/
cp AGENTS.md your-project/

# Or install all Antigravity skills globally
npx ai-workflow-kit --skills
```

Once installed, invoke skills with `@` in the Antigravity sidebar:
- `@commit`, `@pr`, `@review`, `@plan`, `@debug`, `@vibe-audit`
- `@frontend`, `@api`, `@test`, `@refactor`, `@docs`

## Versioning & Changelog

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

### Releasing a new version

```bash
npm run release:patch   # 1.0.0 → 1.0.1  bug fixes
npm run release:minor   # 1.0.0 → 1.1.0  new skills, agents, or hooks
npm run release:major   # 1.0.0 → 2.0.0  breaking changes
```

The release script automatically:
- Reads commits since the last tag and groups them by type (`feat` → Added, `fix` → Fixed, `refactor` → Changed)
- Prepends the new entry to `CHANGELOG.md`
- Bumps `package.json` version
- Creates a single commit and an annotated git tag
- Pushes both to the remote

> Requires a clean working tree and conventional commit messages (`feat:`, `fix:`, `refactor:`, etc.).

## How to Contribute

1. Fork the repo
2. Add your skill in `skills/name.md` following the existing pattern
3. Document the trigger, steps, and rules
4. Open a PR with `/ak:pr`

## Philosophy

- **Diagnose before acting** — an approved plan is worth more than fast code
- **Cross-tool skills** — the same patterns work in Claude Code, Cursor, and Copilot
- **Persistent memory** — the AI should remember context, not ask for it every time
- **Predictable output** — each skill produces the same format, every time
