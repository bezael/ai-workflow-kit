#!/bin/bash
# Hook: post-write-format
# Runs after Claude Code writes or edits a file.
# Automatically formats the file with Prettier or the project's formatter.
#
# Installation: see hooks/settings.template.json
# Input: JSON with the file that was written

INPUT=$(cat)
FILE=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" 2>/dev/null)

if [ -z "$FILE" ]; then
  exit 0
fi

# Only format relevant extensions
EXT="${FILE##*.}"
FORMATTABLE_EXTS="ts tsx js jsx json css scss md yaml yml"

if ! echo "$FORMATTABLE_EXTS" | grep -qw "$EXT"; then
  exit 0
fi

# ─── PRETTIER ────────────────────────────────────────────────────────────────
if command -v prettier &>/dev/null; then
  prettier --write "$FILE" --log-level silent 2>/dev/null
  exit 0
fi

# Try npx prettier if not installed globally
if [ -f "node_modules/.bin/prettier" ]; then
  ./node_modules/.bin/prettier --write "$FILE" --log-level silent 2>/dev/null
  exit 0
fi

# ─── BIOME ───────────────────────────────────────────────────────────────────
if command -v biome &>/dev/null; then
  biome format --write "$FILE" 2>/dev/null
  exit 0
fi

if [ -f "node_modules/.bin/biome" ]; then
  ./node_modules/.bin/biome format --write "$FILE" 2>/dev/null
  exit 0
fi

# If no formatter available, exit without error (don't block the flow)
exit 0
