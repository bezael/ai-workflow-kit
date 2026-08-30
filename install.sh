#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AI Workflow Kit — Installer
# Instala skills, agentes y hooks para Claude Code, Antigravity y Codex
# con un solo comando.
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
# Antigravity global customization root. Antes de la migración vivía en
# ~/.gemini/antigravity/; ahora es ~/.gemini/config/ (las versiones migradas
# dejan un symlink de compatibilidad en la ruta antigua).
ANTIGRAVITY_CONFIG_DIR="$GEMINI_DIR/config"
ANTIGRAVITY_SKILLS_DIR="$ANTIGRAVITY_CONFIG_DIR/skills"
ANTIGRAVITY_LEGACY_SKILLS_DIR="$GEMINI_DIR/antigravity/skills"
CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
CODEX_PROMPTS_DIR="$CODEX_DIR/prompts"
CODEX_REF_DIR="$CODEX_DIR/ak-workflow-kit"

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

  SKILLS_TO_REMOVE=(help setup commit pr review plan execute debug vibe-audit handoff memory)
  AGENTS_TO_REMOVE=(frontend api test refactor docs)
  HOOKS_TO_REMOVE=(pre-bash-safety pre-commit-secrets post-write-format post-edit-lint notify-done)
  ANTIGRAVITY_SKILLS_TO_REMOVE=(help setup commit pr review plan execute debug vibe-audit handoff memory frontend api test refactor docs)
  CODEX_PROMPTS_TO_REMOVE=(ak-help ak-setup ak-commit ak-pr ak-review ak-plan ak-execute ak-debug ak-vibe-audit ak-handoff ak-memory)

  for skill in "${SKILLS_TO_REMOVE[@]}" "${AGENTS_TO_REMOVE[@]}"; do
    # Layout actual (directorio) y layout antiguo (fichero suelto)
    DIR="$SKILLS_DIR/$skill"
    if [ -d "$DIR" ]; then
      run "rm -rf '$DIR'"
      success "Eliminado: $DIR"
    fi
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
    # Ruta actual y ruta pre-migración (en máquinas migradas son la misma vía
    # symlink, así que sólo se borra una vez)
    for base in "$ANTIGRAVITY_SKILLS_DIR" "$ANTIGRAVITY_LEGACY_SKILLS_DIR"; do
      DIR="$base/$skill"
      if [ -d "$DIR" ]; then
        run "rm -rf '$DIR'"
        success "Eliminado Antigravity skill: $DIR"
      fi
    done
  done

  for prompt in "${CODEX_PROMPTS_TO_REMOVE[@]}"; do
    FILE="$CODEX_PROMPTS_DIR/$prompt.md"
    if [ -f "$FILE" ]; then
      run "rm '$FILE'"
      success "Eliminado Codex prompt: $FILE"
    fi
  done

  if [ -d "$CODEX_REF_DIR" ]; then
    run "rm -rf '$CODEX_REF_DIR'"
    success "Eliminado Codex reference: $CODEX_REF_DIR"
  fi

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
if [ -d "$ANTIGRAVITY_CONFIG_DIR" ]; then
  ANTIGRAVITY_DETECTED=true
  success "Google Antigravity detectado: $ANTIGRAVITY_CONFIG_DIR"
elif [ -d "$GEMINI_DIR/antigravity" ]; then
  ANTIGRAVITY_DETECTED=true
  warn "Antigravity detectado en la ruta antigua ($GEMINI_DIR/antigravity)."
  warn "Se instalará en $ANTIGRAVITY_SKILLS_DIR — actualiza Antigravity si no los ve."
else
  info "Google Antigravity no detectado (~/.gemini/config no existe). Los skills de Antigravity se instalarán de todas formas."
fi

# Detectar OpenAI Codex
if command -v codex &>/dev/null; then
  CODEX_VERSION=$(codex --version 2>/dev/null | head -1 || echo "desconocida")
  success "Codex detectado: $CODEX_VERSION"
elif [ -d "$CODEX_DIR" ]; then
  success "Codex detectado: $CODEX_DIR"
else
  info "Codex no detectado ($CODEX_DIR no existe). Los prompts de Codex se instalarán de todas formas."
fi

# ─────────────────────────────────────────────────────────────────────────────
# INSTALAR SKILLS Y AGENTES
# ─────────────────────────────────────────────────────────────────────────────
if ! $HOOKS_ONLY; then
  step "Instalando skills..."
  run "mkdir -p '$SKILLS_DIR'"

  INSTALLED_SKILLS=0
  SKIPPED_SKILLS=0

  for skill_dir in "$SCRIPT_DIR"/skills/*/; do
    skill_name=$(basename "$skill_dir")
    dest="$SKILLS_DIR/$skill_name"

    if [ -d "$dest" ]; then
      # El skill ya existe — preguntar si sobreescribir (salvo --dry-run)
      if $DRY_RUN; then
        run "cp -r '$skill_dir' '$SKILLS_DIR/'"
        INSTALLED_SKILLS=$((INSTALLED_SKILLS + 1))
      else
        read -r -p "  El skill '$skill_name' ya existe. ¿Sobreescribir? [s/N] " confirm
        if [[ "$confirm" =~ ^[sS]$ ]]; then
          cp -r "$skill_dir" "$SKILLS_DIR/"
          success "Actualizado: $skill_name"
          INSTALLED_SKILLS=$((INSTALLED_SKILLS + 1))
        else
          info "Omitido: $skill_name"
          SKIPPED_SKILLS=$((SKIPPED_SKILLS + 1))
        fi
      fi
    else
      run "cp -r '$skill_dir' '$SKILLS_DIR/'"
      success "Instalado skill: $skill_name"
      INSTALLED_SKILLS=$((INSTALLED_SKILLS + 1))
    fi
  done

  step "Instalando agentes..."

  for agent_dir in "$SCRIPT_DIR"/agents/*/; do
    agent_name=$(basename "$agent_dir")
    dest="$SKILLS_DIR/$agent_name"  # Los agentes van en la misma carpeta que skills

    if [ -d "$dest" ]; then
      if $DRY_RUN; then
        run "cp -r '$agent_dir' '$SKILLS_DIR/'"
        INSTALLED_SKILLS=$((INSTALLED_SKILLS + 1))
      else
        read -r -p "  El agente '$agent_name' ya existe. ¿Sobreescribir? [s/N] " confirm
        if [[ "$confirm" =~ ^[sS]$ ]]; then
          cp -r "$agent_dir" "$SKILLS_DIR/"
          success "Actualizado: $agent_name"
          INSTALLED_SKILLS=$((INSTALLED_SKILLS + 1))
        else
          info "Omitido: $agent_name"
          SKIPPED_SKILLS=$((SKIPPED_SKILLS + 1))
        fi
      fi
    else
      run "cp -r '$agent_dir' '$SKILLS_DIR/'"
      success "Instalado agente: $agent_name"
      INSTALLED_SKILLS=$((INSTALLED_SKILLS + 1))
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
        INSTALLED_AG=$((INSTALLED_AG + 1))
      else
        read -r -p "  El skill de Antigravity '$skill_name' ya existe. ¿Sobreescribir? [s/N] " confirm
        if [[ "$confirm" =~ ^[sS]$ ]]; then
          cp -r "$skill_dir" "$ANTIGRAVITY_SKILLS_DIR/"
          success "Actualizado Antigravity skill: $skill_name"
          INSTALLED_AG=$((INSTALLED_AG + 1))
        else
          info "Omitido: $skill_name"
          SKIPPED_AG=$((SKIPPED_AG + 1))
        fi
      fi
    else
      run "cp -r '$skill_dir' '$ANTIGRAVITY_SKILLS_DIR/'"
      success "Instalado Antigravity skill: $skill_name"
      INSTALLED_AG=$((INSTALLED_AG + 1))
    fi
  done

  info "Antigravity skills instalados: $INSTALLED_AG | Omitidos: $SKIPPED_AG"

  # ─── Instalar prompts de OpenAI Codex ─────────────────────────────────────
  step "Instalando prompts para Codex..."
  run "mkdir -p '$CODEX_PROMPTS_DIR'"

  INSTALLED_CX=0
  SKIPPED_CX=0

  for prompt_file in "$SCRIPT_DIR"/codex-prompts/*.md; do
    prompt_name=$(basename "$prompt_file")
    dest="$CODEX_PROMPTS_DIR/$prompt_name"

    if [ -f "$dest" ]; then
      if $DRY_RUN; then
        run "cp '$prompt_file' '$dest'"
        INSTALLED_CX=$((INSTALLED_CX + 1))
      else
        read -r -p "  El prompt de Codex '$prompt_name' ya existe. ¿Sobreescribir? [s/N] " confirm
        if [[ "$confirm" =~ ^[sS]$ ]]; then
          cp "$prompt_file" "$dest"
          success "Actualizado Codex prompt: $prompt_name"
          INSTALLED_CX=$((INSTALLED_CX + 1))
        else
          info "Omitido: $prompt_name"
          SKIPPED_CX=$((SKIPPED_CX + 1))
        fi
      fi
    else
      run "cp '$prompt_file' '$dest'"
      success "Instalado Codex prompt: $prompt_name"
      INSTALLED_CX=$((INSTALLED_CX + 1))
    fi
  done

  # /ak-vibe-audit lee este fichero de referencia (fuera de prompts/ para no
  # generar un slash command fantasma)
  run "mkdir -p '$CODEX_REF_DIR'"
  run "cp '$SCRIPT_DIR/skills/vibe-audit/patterns.md' '$CODEX_REF_DIR/vibe-audit-patterns.md'"
  success "Instalada referencia: $CODEX_REF_DIR/vibe-audit-patterns.md"

  info "Codex prompts instalados: $INSTALLED_CX | Omitidos: $SKIPPED_CX"
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
  echo -e "  Comandos: /ak:help /ak:setup /ak:commit /ak:pr /ak:review /ak:plan /ak:execute /ak:debug /ak:vibe-audit /ak:handoff /ak:memory"
  echo -e "  Agentes:  /ak:frontend /ak:api /ak:test /ak:refactor /ak:docs"
  echo ""
  echo -e "  ${GREEN}Antigravity:${RESET}  $ANTIGRAVITY_SKILLS_DIR"
  echo -e "  Skills:   @help @setup @commit @pr @review @plan @execute @debug @vibe-audit"
  echo -e "  Agentes:  @frontend @api @test @refactor @docs"
  echo ""
  echo -e "  ${GREEN}Codex:${RESET}        $CODEX_PROMPTS_DIR"
  echo -e "  Comandos: /ak-help /ak-setup /ak-commit /ak-pr /ak-review /ak-plan /ak-execute /ak-debug /ak-vibe-audit /ak-handoff /ak-memory"
  echo ""
fi

if ! $SKILLS_ONLY; then
  echo -e "  ${GREEN}Hooks:${RESET}    $HOOKS_DIR"
  echo -e "  ${GREEN}Config:${RESET}   $SETTINGS_FILE"
  echo ""
fi

echo -e "  Reinicia Claude Code (y Codex) para que los cambios surtan efecto."
echo ""

if $DRY_RUN; then
  warn "Modo dry-run — no se realizó ningún cambio real."
  warn "Quita el flag --dry-run para instalar."
fi

echo ""
