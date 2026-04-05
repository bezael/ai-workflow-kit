#!/bin/bash
# AI Workflow Kit — Updater
# Descarga la última versión del repo y reinstala sin preguntar.
#
# Uso: bash update.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "AI Workflow Kit — Update"
echo "────────────────────────"
echo ""

# Si es un repo git, hacer pull
if [ -d "$SCRIPT_DIR/.git" ]; then
  echo "→ Pulling latest changes..."
  git -C "$SCRIPT_DIR" pull --ff-only
  echo ""
fi

# Reinstalar todo sin preguntar (--yes implícito via forzar respuesta)
echo "→ Reinstalando skills, agentes y hooks..."
echo ""

CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills"
HOOKS_DIR="$CLAUDE_DIR/hooks"

mkdir -p "$SKILLS_DIR" "$HOOKS_DIR"

# Skills
for file in "$SCRIPT_DIR"/skills/*.md; do
  cp "$file" "$SKILLS_DIR/"
  echo "  ✓ skill: $(basename "$file")"
done

# Agentes
for file in "$SCRIPT_DIR"/agents/*.md; do
  cp "$file" "$SKILLS_DIR/"
  echo "  ✓ agente: $(basename "$file")"
done

# Hooks
for file in "$SCRIPT_DIR"/hooks/*.sh; do
  cp "$file" "$HOOKS_DIR/"
  chmod +x "$HOOKS_DIR/$(basename "$file")"
  echo "  ✓ hook: $(basename "$file")"
done

echo ""
echo "✓ Update completo. Reinicia Claude Code."
echo ""
