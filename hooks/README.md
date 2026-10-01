# Hooks

Scripts that Claude Code executes automatically before or after its actions.
The difference between a skills repo and a hooks repo is that hooks **don't require the dev to activate them** — they just work.

## Available hooks

| Hook | Event | What it does |
|------|-------|--------------|
| `pre-bash-safety.sh` | Before any Bash | Blocks destructive commands, warns about dangerous ones |
| `pre-commit-secrets.sh` | Before `git commit` | Scans staged files for API keys, tokens, passwords |
| `post-write-format.sh` | After Write or Edit | Formats the file with Prettier or Biome automatically |
| `post-edit-lint.sh` | After Edit | Runs ESLint and returns errors for Claude to fix |
| `protect-tests.sh` | Before Edit/Write/Bash | While `.ak/protect-tests` exists, blocks edits to existing test files (new tests are allowed) |
| `notify-done.sh` | When Claude finishes | Desktop notification (Mac, Linux, Windows) |

## Installation

### 1. Copy the hooks

```bash
mkdir -p ~/.claude/hooks
cp hooks/*.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh
```

### 2. Configure settings.json

**Global** (applies to all your projects):
```bash
cp hooks/settings.template.json ~/.claude/settings.json
```

**Per project** (this project only):
```bash
mkdir -p .claude
cp hooks/settings.template.json .claude/settings.json
```

Edit the paths in `settings.json` if you installed the hooks somewhere else.

### 3. Verify

```bash
claude  # open Claude Code
/hooks  # shows active hooks
```

## How events work

| Claude Code Event | When it fires |
|-------------------|---------------|
| `PreToolUse` | Before Claude uses a tool (Bash, Write, Edit...) |
| `PostToolUse` | After Claude uses a tool |
| `Stop` | When Claude finishes responding |
| `Notification` | When Claude wants to notify something |

## Customizing a hook

Each script reads input as JSON from `stdin`. Input structure:

```json
// PreToolUse / PostToolUse
{
  "tool_name": "Bash",
  "tool_input": {
    "command": "git status",       // only for Bash
    "file_path": "/path/to/file"   // only for Write/Edit
  }
}

// Stop
{
  "stop_reason": "end_turn"
}
```

Output:
- `exit 0` — allow / continue (stderr is only visible in verbose mode)
- `exit 2` + message in stderr — block the action and send the message to Claude. In `PostToolUse` the action already ran, so it only sends the message
- `exit 0` + JSON on stdout with `hookSpecificOutput.permissionDecision: "ask"` — ask the user to confirm (used by `pre-bash-safety` for risky commands)
- Any other exit code (including `1`) is a non-blocking error: the action runs anyway

## Protecting tests during a fix

`protect-tests.sh` does nothing until you create the marker:

```bash
mkdir -p .ak && touch .ak/protect-tests   # before the fix
rm .ak/protect-tests                      # when you're done (Claude can't)
```

While it exists, Claude can write new test files (the failing test that reproduces the bug) but can't edit existing ones. It has to make them pass by changing the code.

## Security

Hooks have full system access. Review each script before installing.
The hooks in this repo only read information — they never write or modify files
except `post-write-format.sh` which formats the file just written.

## Guardrails vs Final Verify

Hooks and `npx ai-workflow-kit verify <slug> --final` are complementary layers
of the same harness, acting at different moments:

- **Hooks are edit-time guardrails.** They fire while the agent works — block
  a destructive command, stop a secret from being committed, format and lint
  what was just written. They belong to the tool session, not to the feature.
- **Final Verify is completion-time evidence.** It re-runs every task's
  `Verify:` command plus the global Test / Lint / Typecheck / Build / E2E
  checks from `.ak/config.md`, and rules on the feature as a whole.

Hooks deliberately do not participate in `--final`: a hook depends on which
tool (and whose machine) is running, while a final verification must mean the
same thing in CI, on a teammate's laptop, or under a different agent. Keep the
guardrails installed; let `--final` be the completion gate.
