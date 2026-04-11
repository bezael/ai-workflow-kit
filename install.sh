#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AI Workflow Kit — Installer
# Instala skills, agentes y hooks en Claude Code con un solo comando.
#
# Uso:
#   bash install.sh              # instalación completa
#   bash install.sh --hooks-only # solo hooks
#   bash install.sh --skills-only# solo skills y agentes
#   bash install.sh --dry-run    # muestra qué haría sin hacer nada
#   bash install.sh --uninstall  # elimina todo lo instalado
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── COLORES ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ─── HELPERS ─────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}ℹ${RESET}  $*"; }
success() { echo -e "${GREEN}✓${RESET}  $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
error()   { echo -e "${RED}✗${RESET}  $*" >&2; }
step()    { echo -e "\n${BOLD}${CYAN}→ $*${RESET}"; }

# ─── FLAGS ───────────────────────────────────────────────────────────────────
DRY_RUN=false
HOOKS_ONLY=false
SKILLS_ONLY=false
UNINSTALL=false

for arg in "$@"; do
  case $arg in
    --dry-run)    DRY_RUN=true ;;
    --hooks-only) HOOKS_ONLY=true ;;
    --skills-only)SKILLS_ONLY=true ;;
    --uninstall)  UNINSTALL=true ;;
    --help|-h)
      echo "Uso: bash install.sh [opciones]"
      echo ""
      echo "Opciones:"
      echo "  --dry-run      Muestra qué haría sin hacer nada"
      echo "  --hooks-only   Solo instala hooks"
      echo "  --skills-only  Solo instala skills y agentes"
      echo "  --uninstall    Desinstala todo"
      echo "  --help         Muestra esta ayuda"
      exit 0
      ;;
    *)
      error "Opción desconocida: $arg"
      exit 1
      ;;
  esac
done

# ─── RUTAS ───────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills"
HOOKS_DIR="$CLAUDE_DIR/hooks"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
GEMINI_DIR="$HOME/.gemini"
ANTIGRAVITY_SKILLS_DIR="$GEMINI_DIR/antigravity/skills"

# ─── DRY RUN wrapper ─────────────────────────────────────────────────────────
run() {
  if $DRY_RUN; then
    echo -e "  ${YELLOW}[dry-run]${RESET} $*"
  else
    eval "$@"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# HEADER
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}AI Workflow Kit — Installer${RESET}"
echo -e "────────────────────────────────────"
$DRY_RUN && warn "Modo dry-run: no se hará ningún cambio real"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# UNINSTALL
# ─────────────────────────────────────────────────────────────────────────────
if $UNINSTALL; then
  step "Desinstalando AI Workflow Kit..."

  SKILLS_TO_REMOVE=(commit pr review plan debug vibe-audit)
  AGENTS_TO_REMOVE=(frontend api test refactor docs)
  HOOKS_TO_REMOVE=(pre-bash-safety pre-commit-secrets post-write-format post-edit-lint notify-done)
  ANTIGRAVITY_SKILLS_TO_REMOVE=(commit pr review plan debug vibe-audit frontend api test refactor docs)

  for skill in "${SKILLS_TO_REMOVE[@]}" "${AGENTS_TO_REMOVE[@]}"; do
    FILE="$SKILLS_DIR/$skill.md"
    if [ -f "$FILE" ]; then
      run "rm '$FILE'"
      success "Eliminado: $FILE"
    fi
  done

  for hook in "${HOOKS_TO_REMOVE[@]}"; do
    FILE="$HOOKS_DIR/$hook.sh"
    if [ -f "$FILE" ]; then
      run "rm '$FILE'"
      success "Eliminado: $FILE"
    fi
  done

  for skill in "${ANTIGRAVITY_SKILLS_TO_REMOVE[@]}"; do
    DIR="$ANTIGRAVITY_SKILLS_DIR/$skill"
    if [ -d "$DIR" ]; then
      run "rm -rf '$DIR'"
      success "Eliminado Antigravity skill: $DIR"
    fi
  done

  warn "settings.json NO se eliminó automáticamente."
  warn "Si quieres eliminarlo: rm $SETTINGS_FILE"
  echo ""
  success "Desinstalación completa."
  exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# VERIFICACIONES PREVIAS
# ─────────────────────────────────────────────────────────────────────────────
step "Verificando entorno..."

# Detectar OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS="mac"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  OS="linux"
elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
  OS="windows"
fi
info "Sistema operativo: $OS"

# Verificar que existe el directorio de Claude Code
if [ ! -d "$CLAUDE_DIR" ]; then
  warn "No se encontró ~/.claude — creando directorio..."
  run "mkdir -p '$CLAUDE_DIR'"
fi
success "Directorio Claude Code: $CLAUDE_DIR"

# Verificar Claude Code instalado
if command -v claude &>/dev/null; then
  CLAUDE_VERSION=$(claude --version 2>/dev/null | head -1 || echo "desconocida")
  success "Claude Code detectado: $CLAUDE_VERSION"
else
  warn "Claude Code no está en el PATH. Instálalo con: npm install -g @anthropic-ai/claude-code"
fi

# Detectar Google Antigravity
ANTIGRAVITY_DETECTED=false
if [ -d "$GEMINI_DIR" ]; then
  ANTIGRAVITY_DETECTED=true
  success "Google Antigravity detectado: $GEMINI_DIR"
else
  info "Google Antigravity no detectado (~/.gemini no existe). Los skills de Antigravity se instalarán de todas formas."
fi

# ─────────────────────────────────────────────────────────────────────────────
# INSTALAR SKILLS Y AGENTES
# ─────────────────────────────────────────────────────────────────────────────
if ! $HOOKS_ONLY; then
  step "Instalando skills..."
  run "mkdir -p '$SKILLS_DIR'"

  INSTALLED_SKILLS=0
  SKIPPED_SKILLS=0

  for skill_file in "$SCRIPT_DIR"/skills/*.md; do
    skill_name=$(basename "$skill_file")
    dest="$SKILLS_DIR/$skill_name"

    if [ -f "$dest" ]; then
      # El skill ya existe — preguntar si sobreescribir (salvo --dry-run)
      if $DRY_RUN; then
        run "cp '$skill_file' '$dest'"
        ((INSTALLED_SKILLS++))
      else
        read -r -p "  El skill '$skill_name' ya existe. ¿Sobreescribir? [s/N] " confirm
        if [[ "$confirm" =~ ^[sS]$ ]]; then
          cp "$skill_file" "$dest"
          success "Actualizado: $skill_name"
          ((INSTALLED_SKILLS++))
        else
          info "Omitido: $skill_name"
          ((SKIPPED_SKILLS++))
        fi
      fi
    else
      run "cp '$skill_file' '$dest'"
      success "Instalado skill: $skill_name"
      ((INSTALLED_SKILLS++))
    fi
  done

  step "Instalando agentes..."

  for agent_file in "$SCRIPT_DIR"/agents/*.md; do
    agent_name=$(basename "$agent_file")
    dest="$SKILLS_DIR/$agent_name"  # Los agentes van en la misma carpeta que skills

    if [ -f "$dest" ]; then
      if $DRY_RUN; then
        run "cp '$agent_file' '$dest'"
        ((INSTALLED_SKILLS++))
      else
        read -r -p "  El agente '$agent_name' ya existe. ¿Sobreescribir? [s/N] " confirm
        if [[ "$confirm" =~ ^[sS]$ ]]; then
          cp "$agent_file" "$dest"
          success "Actualizado: $agent_name"
          ((INSTALLED_SKILLS++))
        else
          info "Omitido: $agent_name"
          ((SKIPPED_SKILLS++))
        fi
      fi
    else
      run "cp '$agent_file' '$dest'"
      success "Instalado agente: $agent_name"
      ((INSTALLED_SKILLS++))
    fi
  done

  info "Skills instalados: $INSTALLED_SKILLS | Omitidos: $SKIPPED_SKILLS"

  # ─── Instalar skills de Google Antigravity ────────────────────────────────
  step "Instalando skills para Google Antigravity..."
  run "mkdir -p '$ANTIGRAVITY_SKILLS_DIR'"

  INSTALLED_AG=0
  SKIPPED_AG=0

  for skill_dir in "$SCRIPT_DIR"/antigravity-skills/*/; do
    skill_name=$(basename "$skill_dir")
    dest="$ANTIGRAVITY_SKILLS_DIR/$skill_name"

    if [ -d "$dest" ]; then
      if $DRY_RUN; then
        run "cp -r '$skill_dir' '$ANTIGRAVITY_SKILLS_DIR/'"
        ((INSTALLED_AG++))
      else
        read -r -p "  El skill de Antigravity '$skill_name' ya existe. ¿Sobreescribir? [s/N] " confirm
        if [[ "$confirm" =~ ^[sS]$ ]]; then
          cp -r "$skill_dir" "$ANTIGRAVITY_SKILLS_DIR/"
          success "Actualizado Antigravity skill: $skill_name"
          ((INSTALLED_AG++))
        else
          info "Omitido: $skill_name"
          ((SKIPPED_AG++))
        fi
      fi
    else
      run "cp -r '$skill_dir' '$ANTIGRAVITY_SKILLS_DIR/'"
      success "Instalado Antigravity skill: $skill_name"
      ((INSTALLED_AG++))
    fi
  done

  info "Antigravity skills instalados: $INSTALLED_AG | Omitidos: $SKIPPED_AG"
fi

# ─────────────────────────────────────────────────────────────────────────────
# INSTALAR HOOKS
# ─────────────────────────────────────────────────────────────────────────────
if ! $SKILLS_ONLY; then
  step "Instalando hooks..."
  run "mkdir -p '$HOOKS_DIR'"

  for hook_file in "$SCRIPT_DIR"/hooks/*.sh; do
    hook_name=$(basename "$hook_file")
    dest="$HOOKS_DIR/$hook_name"
    run "cp '$hook_file' '$dest'"
    run "chmod +x '$dest'"
    success "Instalado hook: $hook_name"
  done

  # ─── Configurar settings.json ───────────────────────────────────────────
  step "Configurando settings.json..."

  if [ ! -f "$SETTINGS_FILE" ]; then
    # No existe settings.json — crear desde template
    TEMPLATE="$SCRIPT_DIR/hooks/settings.template.json"

    # Reemplazar las rutas del template con la ruta real de hooks
    if $DRY_RUN; then
      run "cp '$TEMPLATE' '$SETTINGS_FILE'"
    else
      sed "s|~/.claude/hooks|$HOOKS_DIR|g" "$TEMPLATE" > "$SETTINGS_FILE"
      # Eliminar líneas de _comment del JSON final (no es JSON válido)
      python3 -c "
import json, sys
with open('$SETTINGS_FILE') as f:
    content = f.read()
# Eliminar líneas _comment y _note que no son JSON válido
import re
content = re.sub(r'\s*\"_comment\":[^,\n]+,?\n', '\n', content)
content = re.sub(r'\s*\"_note\":[^,\n]+,?\n', '\n', content)
content = re.sub(r'\s*\"_docs\":[^,\n]+,?\n', '\n', content)
# Limpiar comas sobrantes antes de }
content = re.sub(r',\s*\n(\s*[}\]])', r'\n\1', content)
try:
    parsed = json.loads(content)
    with open('$SETTINGS_FILE', 'w') as f:
        json.dump(parsed, f, indent=2)
    print('OK')
except json.JSONDecodeError as e:
    # Si falla el parse, usamos el template tal cual
    import shutil
    shutil.copy('$SCRIPT_DIR/hooks/settings.template.json', '$SETTINGS_FILE')
    print('FALLBACK')
" 2>/dev/null || cp "$TEMPLATE" "$SETTINGS_FILE"
    fi
    success "settings.json creado en: $SETTINGS_FILE"

  else
    # Ya existe settings.json — hacer merge de los hooks
    warn "settings.json ya existe. Añadiendo hooks sin sobreescribir tu config..."

    if ! $DRY_RUN; then
      python3 -c "
import json, sys

with open('$SETTINGS_FILE') as f:
    try:
        existing = json.load(f)
    except json.JSONDecodeError:
        existing = {}

# Asegurar que la clave hooks existe
if 'hooks' not in existing:
    existing['hooks'] = {}

hooks_dir = '$HOOKS_DIR'

new_hooks = {
    'PreToolUse': [
        {
            'matcher': 'Bash',
            'hooks': [
                {'type': 'command', 'command': f'bash {hooks_dir}/pre-bash-safety.sh'},
                {'type': 'command', 'command': f'bash {hooks_dir}/pre-commit-secrets.sh'}
            ]
        }
    ],
    'PostToolUse': [
        {
            'matcher': 'Write',
            'hooks': [{'type': 'command', 'command': f'bash {hooks_dir}/post-write-format.sh'}]
        },
        {
            'matcher': 'Edit',
            'hooks': [
                {'type': 'command', 'command': f'bash {hooks_dir}/post-write-format.sh'},
                {'type': 'command', 'command': f'bash {hooks_dir}/post-edit-lint.sh'}
            ]
        }
    ],
    'Stop': [
        {
            'matcher': '.*',
            'hooks': [{'type': 'command', 'command': f'bash {hooks_dir}/notify-done.sh'}]
        }
    ]
}

# Merge: añadir sin duplicar
for event, matchers in new_hooks.items():
    if event not in existing['hooks']:
        existing['hooks'][event] = []
    for new_matcher in matchers:
        # Verificar si ya hay un matcher igual
        already_exists = any(
            m.get('matcher') == new_matcher['matcher']
            for m in existing['hooks'][event]
        )
        if not already_exists:
            existing['hooks'][event].append(new_matcher)

with open('$SETTINGS_FILE', 'w') as f:
    json.dump(existing, f, indent=2)

print('Merge completado')
" && success "Hooks añadidos a settings.json existente" || warn "No se pudo hacer merge automático. Revisa $SETTINGS_FILE manualmente."
    else
      run "# merge de hooks en settings.json existente"
    fi
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# RESUMEN FINAL
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}────────────────────────────────────${RESET}"
echo -e "${BOLD}${GREEN}Instalación completa${RESET}"
echo -e "${BOLD}────────────────────────────────────${RESET}"
echo ""

if ! $HOOKS_ONLY; then
  echo -e "  ${GREEN}Claude Code:${RESET}  $SKILLS_DIR"
  echo -e "  Comandos: /ak:commit /ak:pr /ak:review /ak:plan /ak:debug /ak:vibe-audit"
  echo -e "  Agentes:  /ak:frontend /ak:api /ak:test /ak:refactor /ak:docs"
  echo ""
  echo -e "  ${GREEN}Antigravity:${RESET}  $ANTIGRAVITY_SKILLS_DIR"
  echo -e "  Skills:   @commit @pr @review @plan @debug @vibe-audit"
  echo -e "  Agentes:  @frontend @api @test @refactor @docs"
  echo ""
fi

if ! $SKILLS_ONLY; then
  echo -e "  ${GREEN}Hooks:${RESET}    $HOOKS_DIR"
  echo -e "  ${GREEN}Config:${RESET}   $SETTINGS_FILE"
  echo ""
fi

echo -e "  Reinicia Claude Code para que los cambios surtan efecto."
echo ""

if $DRY_RUN; then
  warn "Modo dry-run — no se realizó ningún cambio real."
  warn "Quita el flag --dry-run para instalar."
fi

echo ""
