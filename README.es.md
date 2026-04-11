# AI Workflow Kit

![AI Workflow Kit](./banner.png)

Skills, agentes y hooks para trabajar con herramientas de AI coding de forma consistente y profesional.
Compatible con **Claude Code**, **Cursor**, **GitHub Copilot** y **Google Antigravity**.

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
├── skills/
│   ├── commit.md                   # /ak:commit — genera mensajes de commit semánticos
│   ├── pr.md                       # /ak:pr — crea PRs con descripción completa
│   ├── review.md                   # /ak:review — revisa código con criterios reales de ingeniería
│   ├── plan.md                     # /ak:plan — planifica antes de ejecutar
│   └── debug.md                    # /ak:debug — workflow de debugging estructurado
├── agents/
│   ├── frontend.md                 # /ak:frontend — genera componentes de UI
│   ├── api.md                      # /ak:api — genera endpoints con validación
│   ├── test.md                     # /ak:test — escribe tests orientados a comportamiento
│   ├── refactor.md                 # /ak:refactor — mejora código sin romper nada
│   └── docs.md                     # /ak:docs — JSDoc, README, ADR
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
| plan | `/ak:plan [tarea]` | Planifica antes de ejecutar tareas complejas |
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

Copia `GEMINI.md` y `AGENTS.md` a la raíz de tu proyecto. El installer copia los skills a `~/.gemini/antigravity/skills/` automáticamente.

```bash
# Copiar reglas del proyecto
cp GEMINI.md tu-proyecto/
cp AGENTS.md tu-proyecto/

# O instalar todos los skills de Antigravity globalmente
npx ai-workflow-kit --skills
```

Una vez instalados, invoca los skills con `@` en el sidebar de Antigravity:
- `@commit`, `@pr`, `@review`, `@plan`, `@debug`, `@vibe-audit`
- `@frontend`, `@api`, `@test`, `@refactor`, `@docs`

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
- **Skills cross-tool** — los mismos patrones funcionan en Claude Code, Cursor, Copilot y Antigravity
- **Memoria persistente** — la IA debe recordar el contexto, no pedirlo cada vez
- **Output predecible** — cada skill produce el mismo formato, siempre
