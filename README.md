# AI Workflow Kit

![AI Workflow Kit](./banner.png)

Skills, agents, and hooks for working with AI coding tools consistently and professionally.
Works with **Claude Code**, **Cursor**, and **GitHub Copilot**.

## Installation

```bash
npx ai-workflow-kit
```

Restart Claude Code. You'll have `/commit`, `/pr`, `/plan`, `/debug`, `/review`, `/vibe-audit`, `/frontend`, `/api`, `/test`, `/refactor`, and `/docs` available — plus 5 automatic hooks.

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
├── .cursorrules                     # Rules for Cursor
├── .github/
│   └── copilot-instructions.md     # Instructions for GitHub Copilot
├── skills/
│   ├── commit.md                   # /commit — generates semantic commit messages
│   ├── pr.md                       # /pr — creates PRs with full description
│   ├── review.md                   # /review — reviews code with real engineering criteria
│   ├── plan.md                     # /plan — plans before executing
│   └── debug.md                    # /debug — structured debugging workflow
├── agents/
│   ├── frontend.md                 # /frontend — generates UI components
│   ├── api.md                      # /api — generates endpoints with validation
│   ├── test.md                     # /test — writes behavior-driven tests
│   ├── refactor.md                 # /refactor — improves code without breaking anything
│   └── docs.md                     # /docs — JSDoc, README, ADR
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
| commit | `/commit` | Reads the real diff and generates a semantic commit message |
| pr | `/pr` | Creates PR with description, test plan, and checklist |
| review | `/review @file` | Reviews code: bugs, security, performance |
| plan | `/plan [task]` | Plans before executing complex tasks |
| debug | `/debug [problem]` | Diagnoses with hypotheses before proposing fixes |
| vibe-audit | `/vibe-audit` | Full audit of apps generated with vibe coding |

## Specialized Agents

| Agent | Command | What it does |
|-------|---------|--------------|
| frontend | `/frontend [description]` | Generates components following the project's design system |
| api | `/api [description]` | Generates endpoints with validation, auth, and error handling |
| test | `/test @file` | Writes tests by behavior, not by implementation |
| refactor | `/refactor @file` | Improves code without changing behavior |
| docs | `/docs @file` | Generates JSDoc, README, or ADR as needed |

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

## How to Contribute

1. Fork the repo
2. Add your skill in `skills/name.md` following the existing pattern
3. Document the trigger, steps, and rules
4. Open a PR with `/pr`

## Philosophy

- **Diagnose before acting** — an approved plan is worth more than fast code
- **Cross-tool skills** — the same patterns work in Claude Code, Cursor, and Copilot
- **Persistent memory** — the AI should remember context, not ask for it every time
- **Predictable output** — each skill produces the same format, every time
