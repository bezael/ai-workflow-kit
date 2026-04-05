#!/bin/bash
# Hook: pre-bash-safety
# Runs before each Bash command that Claude Code executes.
# Blocks dangerous commands and warns about destructive ones.
#
# Installation: see hooks/settings.template.json
# Input: the command Claude wants to run comes from stdin as JSON
# Output: exit 0 = allow, exit 1 = block (with error message)

# Read JSON input from stdin
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null)

if [ -z "$COMMAND" ]; then
  exit 0
fi

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
    exit 1
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
    echo "WARNING: Command contains a high-risk operation: '$pattern'" >&2
    echo "Review the command before approving it." >&2
    # Not blocking — just warning. Claude Code will show the warning to the user.
    # The user can approve or reject in the UI.
    exit 0
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
    echo "WARNING: Command may expose credentials or secrets." >&2
    echo "Verify you're not logging or exposing sensitive information." >&2
    exit 0
  fi
done

exit 0
