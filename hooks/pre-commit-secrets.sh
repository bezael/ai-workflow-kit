#!/bin/bash
# Hook: pre-commit-secrets
# Runs when Claude Code runs a git commit command.
# Scans staged files for secrets, API keys, and credentials.
# Blocks the commit if it finds anything suspicious.
#
# Detected patterns: API keys, tokens, hardcoded passwords, URLs with credentials

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null)

# Only act on git commit commands
if ! echo "$COMMAND" | grep -q "git commit"; then
  exit 0
fi

# Get staged files
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

FOUND_SECRETS=0
ISSUES=""

# ─── SECRET PATTERNS ─────────────────────────────────────────────────────────
SECRET_PATTERNS=(
  # Generic API Keys
  "api[_-]?key\s*[=:]\s*['\"][A-Za-z0-9_-]{20,}"
  "api[_-]?secret\s*[=:]\s*['\"][A-Za-z0-9_-]{20,}"

  # OpenAI / Anthropic / common
  "sk-[A-Za-z0-9]{32,}"
  "sk-ant-[A-Za-z0-9-]{40,}"

  # AWS
  "AKIA[0-9A-Z]{16}"
  "aws[_-]secret[_-]access[_-]key\s*[=:]\s*['\"][A-Za-z0-9+/]{40}"

  # Generic tokens
  "Bearer [A-Za-z0-9_-]{30,}"
  "token\s*[=:]\s*['\"][A-Za-z0-9_.-]{30,}"

  # Hardcoded passwords
  "password\s*[=:]\s*['\"][^'\"]{8,}['\"]"
  "passwd\s*[=:]\s*['\"][^'\"]{8,}['\"]"

  # URLs with credentials
  "https?://[^:]+:[^@]+@"
  "mongodb://[^:]+:[^@]+@"
  "postgresql://[^:]+:[^@]+@"

  # Private keys
  "BEGIN RSA PRIVATE KEY"
  "BEGIN OPENSSH PRIVATE KEY"
  "BEGIN EC PRIVATE KEY"
)

for file in $STAGED_FILES; do
  # Skip binary files and lock files
  if echo "$file" | grep -qE "\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot|zip|tar|gz|lock|sum)$"; then
    continue
  fi

  # Skip .env.example — having examples there is intentional
  if echo "$file" | grep -q "\.env\.example"; then
    continue
  fi

  if [ ! -f "$file" ]; then
    continue
  fi

  for pattern in "${SECRET_PATTERNS[@]}"; do
    MATCH=$(git diff --cached "$file" | grep "^+" | grep -iE "$pattern" 2>/dev/null | head -1)
    if [ -n "$MATCH" ]; then
      FOUND_SECRETS=1
      ISSUES="$ISSUES\n  [$file] Possible secret: $MATCH"
      break
    fi
  done
done

if [ $FOUND_SECRETS -eq 1 ]; then
  echo "🚨 COMMIT BLOCKED: Possible secrets detected in staged files:" >&2
  echo -e "$ISSUES" >&2
  echo "" >&2
  echo "Options:" >&2
  echo "  1. Remove the secret from code and use environment variables" >&2
  echo "  2. Add the file to .gitignore if it contains secrets" >&2
  echo "  3. If this is a false positive, review the pattern in hooks/pre-commit-secrets.sh" >&2
  exit 1
fi

exit 0
