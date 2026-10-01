#!/bin/bash
# Hook: pre-bash-safety
# Runs before each Bash command that Claude Code executes.
# Blocks dangerous commands and warns about destructive ones.
#
# Installation: see hooks/settings.template.json
# Input: the command Claude wants to run comes from stdin as JSON
# Output: exit 0 = allow, exit 2 = block (stderr goes to Claude),
#         JSON permissionDecision "ask" on stdout = ask the user

# Read JSON input from stdin
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('tool_input') or {}).get('command') or d.get('command',''))" 2>/dev/null)

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Asks the user to confirm instead of blocking. Exit 0 + stderr is only visible
# in verbose mode, so the warning must go through a permission decision.
ask_user() {
  python3 -c 'import json,sys; print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask", "permissionDecisionReason": sys.argv[1]}}))' "$1"
  exit 0
}

# ─── ABSOLUTE BLOCK ──────────────────────────────────────────────────────────
# Commands that must never run without direct human intervention.

BLOCKED_PATTERNS=(
  "rm -rf /"
  "rm -rf ~"
  "rm -rf \$HOME"
  "dd if="
  "mkfs"
  "> /dev/sda"
  "chmod -R 777 /"
  ":(){ :|:& };:"   # fork bomb
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qF "$pattern"; then
    echo "BLOCKED: Command contains an irreversible destructive operation: '$pattern'" >&2
    echo "If you need to run this, do it manually in your terminal." >&2
    exit 2
  fi
done

# ─── WARNINGS ────────────────────────────────────────────────────────────────
# Dangerous commands that require the user to confirm manually.

WARN_PATTERNS=(
  "git push --force"
  "git push -f"
  "git reset --hard"
  "git clean -f"
  "DROP TABLE"
  "DROP DATABASE"
  "DELETE FROM"
  "truncate"
)

for pattern in "${WARN_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qi "$pattern"; then
    # Not blocking — Claude Code shows a permission prompt with this reason.
    # The user approves or rejects it in the UI.
    ask_user "WARNING: Command contains a high-risk operation: '$pattern'. Review it before approving."
  fi
done

# ─── SECRET DETECTION ────────────────────────────────────────────────────────
# Detects if the command will expose or save credentials.

SECRET_PATTERNS=(
  "OPENAI_API_KEY"
  "ANTHROPIC_API_KEY"
  "AWS_SECRET"
  "DATABASE_URL.*password"
  "Bearer [A-Za-z0-9_-]{20,}"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    ask_user "WARNING: Command may expose credentials or secrets. Verify you're not logging or exposing sensitive information."
  fi
done

exit 0
