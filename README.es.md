# AI Workflow Kit

![AI Workflow Kit](./banner.png)

Skills, agentes y hooks para trabajar con herramientas de AI coding de forma consistente y profesional.
Compatible con **Claude Code**, **Cursor**, **GitHub Copilot**, **Google Antigravity** y **OpenAI Codex**.

## Instalación

```bash
npx ai-workflow-kit
```

Reinicia tu herramienta de AI. Tendrás disponibles `/ak:commit`, `/ak:pr`, `/ak:plan`, `/ak:debug`, `/ak:review`, `/ak:vibe-audit`, `/ak:frontend`, `/ak:api`, `/ak:test`, `/ak:refactor`, `/ak:docs` — más 5 hooks automáticos.

```bash
npx ai-workflow-kit --skills   # solo skills y agentes
npx ai-workflow-kit --hooks    # solo hooks
npx ai-workflow-kit --yes      # sin confirmaciones
npx ai-workflow-kit --list     # ver qué se instalaría
npx ai-workflow-kit --uninstall
```

## Ejecutar un plan

`/ak:plan` escribe `specs/<slug>/plan.md` con un checkbox por paso, cada uno con
el comando que demuestra que está hecho. El subcomando `verify` ejecuta esos
comandos y marca la casilla solo si el comando sale con 0, así que lo que
registra el fichero es lo que se demostró, no lo que se afirmó:

```bash
npx ai-workflow-kit verify <slug>            # ejecuta el siguiente paso sin marcar
npx ai-workflow-kit verify <slug> --all      # sigue hasta que uno falle
npx ai-workflow-kit verify <slug> --recheck  # reejecuta los marcados, detecta regresiones
npx ai-workflow-kit verify <slug> --dry-run  # muestra los comandos, no ejecuta nada
```

Sin slug elige el único plan con trabajo pendiente, y se niega a adivinar si hay
varios. Pregunta antes de cada comando salvo que pases `--yes`.

> Los comandos salen de un fichero markdown de tu working tree. Un `specs/` de
> un repo en el que no confías puede ejecutar cualquier cosa que ejecute tu
> shell — lee un plan antes de verificarlo, como cualquier script.

O manualmente:

```bash
cp -r skills/* ~/.claude/skills/
cp -r agents/* ~/.claude/skills/
cp -r hooks/*.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh
```

## Estructura

```
ai-workflow-kit/
├── CLAUDE.md                        # Instrucciones para Claude Code
├── GEMINI.md                        # Instrucciones para Google Antigravity
├── AGENTS.md                        # Reglas cross-tool (todas las herramientas AI)
├── .cursorrules                     # Reglas para Cursor
├── .github/
│   └── copilot-instructions.md     # Instrucciones para GitHub Copilot
├── antigravity-skills/
│   ├── commit/SKILL.md             # @commit — genera mensajes de commit semánticos
│   ├── pr/SKILL.md                 # @pr — crea PRs con descripción completa
│   ├── review/SKILL.md             # @review — revisa código con criterios reales
│   ├── plan/SKILL.md               # @plan — planifica antes de ejecutar
│   ├── debug/SKILL.md              # @debug — workflow de debugging estructurado
│   ├── vibe-audit/SKILL.md         # @vibe-audit — audita apps generadas con vibe coding
│   ├── frontend/SKILL.md           # @frontend — genera componentes de UI
│   ├── api/SKILL.md                # @api — genera endpoints con validación
│   ├── test/SKILL.md               # @test — escribe tests orientados a comportamiento
│   ├── refactor/SKILL.md           # @refactor — mejora código sin romper nada
│   └── docs/SKILL.md               # @docs — JSDoc, README, ADR
├── codex-prompts/
│   ├── ak-commit.md                # /ak-commit — genera mensajes de commit semánticos
│   ├── ak-pr.md                    # /ak-pr — crea PRs con descripción completa
│   ├── ak-review.md                # /ak-review — revisa código con criterios reales
│   ├── ak-plan.md                  # /ak-plan — planifica antes de ejecutar
│   ├── ak-debug.md                 # /ak-debug — workflow de debugging estructurado
│   ├── ak-vibe-audit.md            # /ak-vibe-audit — audita apps generadas con vibe coding
│   ├── ak-handoff.md               # /ak-handoff — compacta la sesión para un agente nuevo
│   └── ak-memory.md                # /ak-memory — save / recall / clean de la memoria
├── skills/
│   ├── commit/SKILL.md             # /ak:commit — genera mensajes de commit semánticos
│   ├── pr/SKILL.md                 # /ak:pr — crea PRs con descripción completa
│   ├── review/SKILL.md             # /ak:review — revisa código con criterios reales de ingeniería
│   ├── plan/SKILL.md               # /ak:plan — planifica antes de ejecutar
│   ├── debug/SKILL.md              # /ak:debug — workflow de debugging estructurado
│   ├── vibe-audit/SKILL.md         # /ak:vibe-audit — audita apps generadas con vibe coding
│   ├── handoff/SKILL.md            # /ak:handoff — compacta la sesión para un agente nuevo
│   └── memory/SKILL.md             # /ak:memory — save / recall / clean de la memoria
├── agents/
│   ├── frontend/AGENT.md           # /ak:frontend — genera componentes de UI
│   ├── api/AGENT.md                # /ak:api — genera endpoints con validación
│   ├── test/AGENT.md               # /ak:test — escribe tests orientados a comportamiento
│   ├── refactor/AGENT.md           # /ak:refactor — mejora código sin romper nada
│   └── docs/AGENT.md               # /ak:docs — JSDoc, README, ADR
├── hooks/
│   ├── README.md                   # Cómo instalar y personalizar hooks
│   ├── settings.template.json      # Configuración lista para copiar
│   ├── pre-bash-safety.sh          # Bloquea comandos destructivos
│   ├── pre-commit-secrets.sh       # Detecta API keys antes de commitear
│   ├── post-write-format.sh        # Auto-formatea con Prettier/Biome
│   ├── post-edit-lint.sh           # Lintea después de cada edición
│   └── notify-done.sh              # Notificación de escritorio cuando Claude termina
└── memory/
    └── project.md                  # Memoria persistente del proyecto
```

## Skills disponibles

| Skill | Comando | Qué hace |
|-------|---------|----------|
| commit | `/ak:commit` | Lee el diff real y genera un mensaje de commit semántico |
| pr | `/ak:pr` | Crea PR con descripción, plan de tests y checklist |
| review | `/ak:review @file` | Revisa código: bugs, seguridad, performance |
| plan | `/ak:plan [tarea]` | Planifica antes de ejecutar, en un `specs/<slug>/plan.md` reanudable |
| debug | `/ak:debug [problema]` | Diagnostica con hipótesis antes de proponer fixes |
| vibe-audit | `/ak:vibe-audit` | Auditoría completa de apps generadas con vibe coding |

## Agentes especializados

| Agente | Comando | Qué hace |
|--------|---------|----------|
| frontend | `/ak:frontend [descripción]` | Genera componentes siguiendo el design system del proyecto |
| api | `/ak:api [descripción]` | Genera endpoints con validación, auth y manejo de errores |
| test | `/ak:test @file` | Escribe tests por comportamiento, no por implementación |
| refactor | `/ak:refactor @file` | Mejora código sin cambiar comportamiento |
| docs | `/ak:docs @file` | Genera JSDoc, README o ADR según se necesite |

## Hooks disponibles

Los hooks se ejecutan **automáticamente** — el dev no necesita activarlos.

| Hook | Evento | Qué hace |
|------|--------|----------|
| `pre-bash-safety` | Antes de Bash | Bloquea `rm -rf /`, force push, drop table, etc. |
| `pre-commit-secrets` | Antes de `git commit` | Escanea archivos staged buscando API keys y tokens |
| `post-write-format` | Después de Write/Edit | Formatea con Prettier o Biome automáticamente |
| `post-edit-lint` | Después de Edit | Corre ESLint y devuelve errores a Claude |
| `notify-done` | Cuando Claude termina | Notificación de escritorio (Mac/Linux/Windows) |

Ver `hooks/README.md` para instrucciones de instalación.

## Cómo usar con Claude Code

### Instalar los skills

```bash
cp skills/*.md ~/.claude/skills/
```

### Usar en cualquier proyecto

Agrega a tu `CLAUDE.md`:

```markdown
## Skills disponibles
Ver ~/.claude/skills/ para la lista completa.
Memoria del proyecto en memory/project.md.
```

### Usar con Cursor

Las reglas en `.cursorrules` se aplican automáticamente. Copia el archivo a la raíz de tu proyecto.

### Usar con GitHub Copilot

El archivo `.github/copilot-instructions.md` se usa automáticamente en repos de GitHub.

### Usar con Google Antigravity

```bash
npx ai-workflow-kit --antigravity            # pregunta global o proyecto
npx ai-workflow-kit --antigravity --global   # ~/.gemini/config/skills/
npx ai-workflow-kit --antigravity --local    # .agents/skills/ en este proyecto
```

Antigravity descubre los skills en una carpeta `skills/` dentro de un **customization root**, con esta precedencia:

| Prioridad | Ubicación | Alcance |
|-----------|-----------|---------|
| 1 | `.agents/skills/` en la raíz del proyecto | este proyecto (commitéalo para compartir con el equipo) |
| 2 | Rutas declaradas en `.agents/skills.json` | donde tú apuntes |
| 3 | `~/.gemini/config/skills/` | todos los proyectos de tu máquina |
| 4 | Skills built-in | vienen con la app |

Las reglas van aparte y son jerárquicas — `GEMINI.md`, `AGENTS.md` y `.agents/rules/*.md`, cargadas subiendo desde el fichero que editas hasta la raíz del repo. El instalador te deja `GEMINI.md` y `AGENTS.md` en la raíz del proyecto.

> **Cambio de ruta:** las versiones antiguas usaban `~/.gemini/antigravity/skills/`. Antigravity migró el root global a `~/.gemini/config/` y dejó un symlink de compatibilidad en las máquinas que actualizaron in situ. Las instalaciones nuevas no leen la ruta vieja, así que el kit ahora escribe en `~/.gemini/config/skills/`. Si instalaste una versión anterior del kit, ejecuta `npx ai-workflow-kit --antigravity --uninstall`: limpia las dos rutas.

Una vez instalados, invoca los skills con `@` en el sidebar de Antigravity:
- `@commit`, `@pr`, `@review`, `@plan`, `@debug`, `@vibe-audit`
- `@frontend`, `@api`, `@test`, `@refactor`, `@docs`

### Usar con OpenAI Codex

Codex lee dos cosas: el `AGENTS.md` de la raíz del proyecto para las reglas, y `~/.codex/prompts/*.md` para los slash commands. El instalador hace ambas:

```bash
npx ai-workflow-kit --codex
```

Copia `codex-prompts/*.md` a `~/.codex/prompts/` (o `$CODEX_HOME/prompts/` si lo tienes definido) y deja el `AGENTS.md` en el proyecto actual. Reinicia Codex y tendrás:

- `/ak-commit`, `/ak-pr`, `/ak-review`, `/ak-plan`, `/ak-debug`
- `/ak-vibe-audit`, `/ak-handoff`, `/ak-memory`

Codex usa `-` en vez de `:` en los nombres, así que es `/ak-commit`, no `/ak:commit`.

Los agentes especializados (`/ak:frontend`, `/ak:api`, `/ak:test`, `/ak:refactor`, `/ak:docs`) **no** están portados: dependen de los subagentes de Claude Code, y Codex no tiene equivalente.

Para desinstalarlos:

```bash
npx ai-workflow-kit --codex --uninstall
```

## Versionado y Changelog

Este proyecto sigue [Semantic Versioning](https://semver.org/) y [Keep a Changelog](https://keepachangelog.com/).

Ver [CHANGELOG.md](./CHANGELOG.md) para el historial completo de releases.

### Publicar una nueva versión

```bash
npm run release:patch   # 1.0.0 → 1.0.1  bug fixes
npm run release:minor   # 1.0.0 → 1.1.0  nuevos skills, agentes o hooks
npm run release:major   # 1.0.0 → 2.0.0  breaking changes
```

El script de release automáticamente:
- Lee los commits desde el último tag y los agrupa por tipo (`feat` → Added, `fix` → Fixed, `refactor` → Changed)
- Agrega la nueva entrada al inicio de `CHANGELOG.md`
- Actualiza la versión en `package.json`
- Crea un commit y un tag anotado
- Hace push de ambos al remoto

> Requiere un working tree limpio y mensajes de commit en formato Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.).

## Cómo contribuir

1. Haz fork del repo
2. Agrega tu skill en `skills/nombre.md` siguiendo el patrón existente
3. Documenta el trigger, los pasos y las reglas
4. Abre un PR con `/ak:pr`

## Filosofía

- **Diagnosticar antes de actuar** — un plan aprobado vale más que código rápido
- **Skills cross-tool** — los mismos patrones funcionan en Claude Code, Cursor, Copilot, Antigravity y Codex
- **Memoria persistente** — la IA debe recordar el contexto, no pedirlo cada vez
- **Output predecible** — cada skill produce el mismo formato, siempre
