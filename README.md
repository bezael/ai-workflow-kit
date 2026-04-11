# AI Workflow Kit

![AI Workflow Kit](./banner.png)

Skills, agents, and hooks for working with AI coding tools consistently and professionally.
Works with **Claude Code**, **Cursor**, **GitHub Copilot**, and **Google Antigravity**.

## Installation

```bash
npx ai-workflow-kit
```

Restart Claude Code. You'll have `/ak:commit`, `/ak:pr`, `/ak:plan`, `/ak:debug`, `/ak:review`, `/ak:vibe-audit`, `/ak:frontend`, `/ak:api`, `/ak:test`, `/ak:refactor`, and `/ak:docs` available — plus 5 automatic hooks.

```bash
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
| commit | `/ak:commit` | Reads the real diff and generates a semantic commit message |
| pr | `/ak:pr` | Creates PR with description, test plan, and checklist |
| review | `/ak:review @file` | Reviews code: bugs, security, performance |
| plan | `/ak:plan [task]` | Plans before executing complex tasks |
| debug | `/ak:debug [problem]` | Diagnoses with hypotheses before proposing fixes |
| vibe-audit | `/ak:vibe-audit` | Full audit of apps generated with vibe coding |

## Specialized Agents

| Agent | Command | What it does |
|-------|---------|--------------|
| frontend | `/ak:frontend [description]` | Generates components following the project's design system |
| api | `/ak:api [description]` | Generates endpoints with validation, auth, and error handling |
| test | `/ak:test @file` | Writes tests by behavior, not by implementation |
| refactor | `/ak:refactor @file` | Improves code without changing behavior |
| docs | `/ak:docs @file` | Generates JSDoc, README, or ADR as needed |

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
