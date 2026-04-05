#!/bin/bash
# Hook: post-edit-lint
# Runs after Claude Code edits a TypeScript or JavaScript file.
# Runs ESLint and returns errors so Claude can see and fix them.
#
# Why this matters: if Claude generates code with lint errors, it will see them
# immediately in the same session and can fix them without dev intervention.

INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" 2>/dev/null)

if [ -z "$FILE" ]; then
  exit 0
fi

# Only lint TS/JS
EXT="${FILE##*.}"
if ! echo "ts tsx js jsx" | grep -qw "$EXT"; then
  exit 0
fi

# Don't lint config files or test configuration files
if echo "$FILE" | grep -qE "(\.config\.|jest\.|vitest\.|eslint\.)"; then
  exit 0
fi

ESLINT_BIN=""

# Look for ESLint in the local project first
if [ -f "node_modules/.bin/eslint" ]; then
  ESLINT_BIN="./node_modules/.bin/eslint"
elif command -v eslint &>/dev/null; then
  ESLINT_BIN="eslint"
fi

if [ -z "$ESLINT_BIN" ]; then
  exit 0  # No ESLint, do nothing
fi

# Run ESLint and capture output
LINT_OUTPUT=$($ESLINT_BIN "$FILE" --format compact 2>&1)
LINT_EXIT=$?

if [ $LINT_EXIT -ne 0 ] && [ -n "$LINT_OUTPUT" ]; then
  echo "ESLint found issues in $FILE:"
  echo "$LINT_OUTPUT"
  # Exit with 0 to not block — Claude will see the output and can fix it
fi

exit 0
