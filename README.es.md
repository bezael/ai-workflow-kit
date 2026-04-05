# Hooks

Scripts que Claude Code ejecuta automáticamente antes o después de sus acciones.
La diferencia entre un repo de skills y uno de hooks es que los hooks **no requieren que el dev los active** — simplemente funcionan.

## Hooks disponibles

| Hook | Evento | Qué hace |
|------|--------|----------|
| `pre-bash-safety.sh` | Antes de cualquier Bash | Bloquea comandos destructivos, advierte sobre los peligrosos |
| `pre-commit-secrets.sh` | Antes de `git commit` | Escanea staged files buscando API keys, tokens, passwords |
| `post-write-format.sh` | Después de Write o Edit | Formatea el archivo con Prettier o Biome automáticamente |
| `post-edit-lint.sh` | Después de Edit | Corre ESLint y devuelve errores para que Claude los corrija |
| `notify-done.sh` | Cuando Claude termina | Notificación de escritorio (Mac, Linux, Windows) |

## Instalación

### 1. Copia los hooks

```bash
mkdir -p ~/.claude/hooks
cp hooks/*.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh
```

### 2. Configura settings.json

**Global** (aplica a todos tus proyectos):
```bash
cp hooks/settings.template.json ~/.claude/settings.json
```

**Por proyecto** (solo este proyecto):
```bash
mkdir -p .claude
cp hooks/settings.template.json .claude/settings.json
```

Edita las rutas en `settings.json` si instalaste los hooks en otro lugar.

### 3. Verifica

```bash
claude  # abre Claude Code
/hooks  # muestra los hooks activos
```

## Cómo funcionan los eventos

| Evento Claude Code | Cuándo se dispara |
|-------------------|-------------------|
| `PreToolUse` | Antes de que Claude use una herramienta (Bash, Write, Edit...) |
| `PostToolUse` | Después de que Claude usa una herramienta |
| `Stop` | Cuando Claude termina de responder |
| `Notification` | Cuando Claude quiere notificar algo |

## Personalizar un hook

Cada script lee el input como JSON desde `stdin`. Estructura del input:

```json
// PreToolUse / PostToolUse
{
  "tool_name": "Bash",
  "command": "git status",       // solo en Bash
  "file_path": "/ruta/archivo"   // solo en Write/Edit
}

// Stop
{
  "stop_reason": "end_turn"
}
```

Salida:
- `exit 0` — permitir / continuar
- `exit 1` + mensaje en stderr — bloquear + mostrar mensaje al usuario

## Seguridad

Los hooks tienen acceso completo al sistema. Revisa cada script antes de instalarlo.
Los hooks de este repo solo leen información — nunca escriben ni modifican archivos
excepto `post-write-format.sh` que formatea el archivo recién escrito.
