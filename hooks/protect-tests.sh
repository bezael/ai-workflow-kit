#!/bin/bash
# Hook: protect-tests
# Runs before Claude Code edits or writes a file (and before Bash commands).
# While .ak/protect-tests exists, Claude cannot modify existing test files:
# during a fix it has to make the test pass by changing the code, not the test.
#
# Why this matters: an agent fixing code must not be able to weaken the check
# that judges it. A failing test the agent couldn't rewrite is proof the bug is gone.
#
# Usage: create the marker before a fix task, delete it yourself when done.
#   mkdir -p .ak && touch .ak/protect-tests
# New test files are still allowed (writing the failing test is the red step).
#
# Installation: see hooks/settings.template.json
# Output: exit 0 = allow, exit 2 = block (stderr goes to Claude)

INPUT=$(cat)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
MARKER="$PROJECT_DIR/.ak/protect-tests"

if [ ! -f "$MARKER" ]; then
  exit 0
fi

read_field() {
  echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('tool_input') or {}).get('$1') or d.get('$1',''))" 2>/dev/null
}

# ─── BASH: the marker is for a human to remove ───────────────────────────────
COMMAND=$(read_field command)
if [ -n "$COMMAND" ]; then
  if echo "$COMMAND" | grep -qF ".ak/protect-tests"; then
    echo "BLOCKED: .ak/protect-tests can only be removed by the user." >&2
    echo "If the test itself is wrong, stop and explain why to the user." >&2
    exit 2
  fi
  exit 0
fi

# ─── EDIT / WRITE: existing test files are read-only ─────────────────────────
FILE=$(read_field file_path)
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  exit 0  # nothing to protect, or a new file (red step)
fi

NORMALIZED=$(echo "$FILE" | tr '\\' '/')
NAME=$(basename "$NORMALIZED")

IS_TEST=0
if echo "$NAME" | grep -qE '\.(test|spec)\.[A-Za-z0-9]+$|_(test|spec)\.[A-Za-z0-9]+$|^test_.*\.py$'; then
  IS_TEST=1
elif echo "$NORMALIZED" | grep -qE '/(__tests__|tests|test|spec)/'; then
  IS_TEST=1
fi

if [ $IS_TEST -eq 1 ]; then
  echo "BLOCKED: test files are protected during this fix (.ak/protect-tests): $FILE" >&2
  echo "Fix the code, not the test. If the test itself is wrong, stop and tell the user why." >&2
  exit 2
fi

exit 0
