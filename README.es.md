# AI Workflow Kit

![AI Workflow Kit](./banner.png)

Skills, agentes y hooks para trabajar con herramientas de AI coding de forma consistente y profesional.
Compatible con **Claude Code**, **Cursor**, **GitHub Copilot**, **Google Antigravity** y **OpenAI Codex**.

## Instalación

<!-- ak:block quickstart.es -->
```bash
npx ai-workflow-kit
```

O fija una versión como dependencia de desarrollo (es una herramienta de desarrollo, no una dependencia de runtime):

```bash
npm i -D ai-workflow-kit@2.6.0
npx ai-workflow-kit
```

Reinicia tu herramienta de AI. Tendrás disponibles `/ak:api`, `/ak:commit`, `/ak:debug`, `/ak:docs`, `/ak:execute`, `/ak:frontend`, `/ak:handoff`, `/ak:help`, `/ak:memory`, `/ak:plan`, `/ak:pr`, `/ak:refactor`, `/ak:review`, `/ak:setup`, `/ak:test`, `/ak:vibe-audit` — más 5 hooks automáticos.

```bash
npx ai-workflow-kit --global   # instala en ~/.claude/ — todos los proyectos (por defecto)
npx ai-workflow-kit --local    # instala en .claude/ — solo este proyecto
npx ai-workflow-kit --skills   # solo skills y agentes
npx ai-workflow-kit --hooks    # solo hooks
npx ai-workflow-kit --yes      # sin confirmaciones
npx ai-workflow-kit --list     # ver qué se instalaría
npx ai-workflow-kit --uninstall
```
<!-- /ak:block -->

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

### Ejecutar una feature SDD

El mismo motor sirve para Spec-Driven Development. Cuando una herramienta de
specs (como sdd-creator) ha generado `specs/<slug>/spec.md` + `plan.md` +
`tasks.md`, `verify` prefiere `tasks.md` — el artefacto de ejecución SDD — y el
reparto es: la herramienta SDD posee Understand → Spec → Plan → Tasks; este kit
ejecuta Task → Verify → Fix → Review → Final Verify → PR.

```bash
npx ai-workflow-kit verify <slug>            # siguiente task pendiente de tasks.md
npx ai-workflow-kit verify <slug> --final    # el Verify de cada task + los checks globales de .ak/config.md
npx ai-workflow-kit verify <slug> --plan     # fuerza plan.md cuando conviven ambos ficheros
```

Una task es verificable por máquina cuando lleva la misma gramática que los
pasos de un plan — una línea, backticks obligatorios:

```markdown
- [ ] 🟢 **Implementar vote toggle** — files: `src/votes/service.ts`. Criterion: `spec.md §3.2 AC-03`.
      Verify: `npm test -- votes`
```

Las tasks sin línea `Verify:` se reportan como no verificables y nunca se
marcan. `--final` es de solo lectura: reejecuta el Verify de cada task
(detectando regresiones en tasks ya marcadas) y después los comandos `Test` /
`Lint` / `Typecheck` / `Build` / `E2E` registrados bajo `## Commands` en
`.ak/config.md`, e imprime un resumen que termina en `Result: PASS` o `FAIL`.
La skill `/ak:execute` conduce este bucle task a task.

### Priorizar un review

El subcomando `risk` ordena los ficheros cambiados por churn e historial de
fixes según git — los dos predictores deterministas más fuertes de dónde se
concentran los defectos (Nagappan & Ball, 2005; Kim et al., 2007). Sin LLM: un
`git log`, agregado por fichero. `/ak:review` lo ejecuta para decidir dónde va
primero la profundidad del review.

```bash
npx ai-workflow-kit risk                     # puntúa los ficheros cambiados contra la rama base
npx ai-workflow-kit risk src/auth.ts         # puntúa estos ficheros en lugar del diff
npx ai-workflow-kit risk --window 12m --json # ventana de historial más amplia, salida para máquinas
npx ai-workflow-kit risk --focus             # necesidad de review por fichero (HIGH / MEDIUM / LOW) + motivo, para /ak:pr
```

Cada fichero recibe `HIGH` / `MEDIUM` / `low` según sus commits, commits de
fix, churn y número de autores — o `new` cuando no tiene historial en la
ventana, que significa riesgo desconocido, no bajo. La señal ordena el review;
nunca es un hallazgo por sí misma, y un historial escaso se reporta como señal
débil en lugar de como un "low" confiado.

`--focus` convierte eso en la tabla **Review focus** que `/ak:pr` incluye en el
cuerpo de la PR: cada fichero cambiado con su necesidad de review y el motivo.
Un fichero bajo una ruta sensible declarada en `.ak/config.md` por `/ak:setup`
(`src/auth/**`, `db/migrations/**`, …) es siempre HIGH; docs, lockfiles y
fixtures son LOW; el resto toma su nivel de historial, con `new` como MEDIUM.
Una sola PR con el mapa dentro — no una PR por nivel.

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
├── .out-of-scope/                  # Features declinadas por diseño, con el razonamiento
├── bin/
│   ├── cli.js                      # El instalador npx + dispatch de `verify` / `risk`
│   ├── plan-verify.js              # El motor verify — plan.md + tasks.md, --recheck, --final
│   └── risk.js                     # La señal de riesgo churn / fix-history detrás de `risk`
├── src/
│   └── skills/                     # Fuentes de skills escritas a mano — las tres distribuciones se generan desde aquí
├── docs/
│   ├── authoring-skills.md         # Campos del spec, pipeline de build y los gates que CI aplica
│   └── skills/                     # Una página por skill, para humanos
├── evals/                          # Tests deterministas + evals de skills con LLM
├── antigravity-skills/
│   ├── help/SKILL.md               # @help — enruta una tarea a la skill que encaja
│   ├── setup/SKILL.md              # @setup — registra las convenciones del repo en .ak/config.md
│   ├── commit/SKILL.md             # @commit — genera mensajes de commit semánticos
│   ├── pr/SKILL.md                 # @pr — crea PRs con descripción completa
│   ├── review/SKILL.md             # @review — revisa código con criterios reales
│   ├── plan/SKILL.md               # @plan — planifica antes de ejecutar
│   ├── execute/SKILL.md            # @execute — ejecuta una lista de tasks SDD con prueba
│   ├── debug/SKILL.md              # @debug — workflow de debugging estructurado
│   ├── vibe-audit/SKILL.md         # @vibe-audit — audita apps generadas con vibe coding
│   ├── frontend/SKILL.md           # @frontend — genera componentes de UI
│   ├── api/SKILL.md                # @api — genera endpoints con validación
│   ├── test/SKILL.md               # @test — escribe tests orientados a comportamiento
│   ├── refactor/SKILL.md           # @refactor — mejora código sin romper nada
│   └── docs/SKILL.md               # @docs — JSDoc, README, ADR
├── codex-prompts/
│   ├── ak-help.md                  # /ak-help — enruta una tarea a la skill que encaja
│   ├── ak-setup.md                 # /ak-setup — registra las convenciones del repo en .ak/config.md
│   ├── ak-commit.md                # /ak-commit — genera mensajes de commit semánticos
│   ├── ak-pr.md                    # /ak-pr — crea PRs con descripción completa
│   ├── ak-review.md                # /ak-review — revisa código con criterios reales
│   ├── ak-plan.md                  # /ak-plan — planifica antes de ejecutar
│   ├── ak-execute.md               # /ak-execute — ejecuta una lista de tasks SDD con prueba
│   ├── ak-debug.md                 # /ak-debug — workflow de debugging estructurado
│   ├── ak-vibe-audit.md            # /ak-vibe-audit — audita apps generadas con vibe coding
│   ├── ak-handoff.md               # /ak-handoff — compacta la sesión para un agente nuevo
│   └── ak-memory.md                # /ak-memory — save / recall / clean de la memoria
├── skills/
│   ├── help/SKILL.md               # /ak:help — enruta una tarea a la skill que encaja
│   ├── setup/SKILL.md              # /ak:setup — registra las convenciones del repo en .ak/config.md
│   ├── commit/SKILL.md             # /ak:commit — genera mensajes de commit semánticos
│   ├── pr/SKILL.md                 # /ak:pr — crea PRs con descripción completa
│   ├── review/SKILL.md             # /ak:review — revisa código con criterios reales de ingeniería
│   ├── plan/SKILL.md               # /ak:plan — planifica antes de ejecutar
│   ├── execute/SKILL.md            # /ak:execute — ejecuta una lista de tasks SDD con prueba
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

Una página por skill en [`docs/skills/`](docs/skills/README.md) — qué hace, cuándo recurrir a ella y cómo saber que está funcionando (en inglés).

<!-- ak:skill-table -->

| Skill | Comando | Qué hace |
|-------|---------|----------|
| help | `/ak:help [tarea]` | Señala la única skill que encaja con lo que estás haciendo |
| setup | `/ak:setup` | Registra la rama, los comandos y las convenciones del repo en `.ak/config.md` |
| commit | `/ak:commit` | Lee el diff real y genera un mensaje de commit semántico |
| pr | `/ak:pr` | Crea PR con descripción, plan de tests y checklist |
| review | `/ak:review @file` | Revisa código: bugs, seguridad, performance |
| plan | `/ak:plan [tarea]` | Planifica antes de ejecutar, en un `specs/<slug>/plan.md` reanudable |
| execute | `/ak:execute [slug]` | Ejecuta la siguiente task SDD pendiente y deja que `verify` la demuestre |
| debug | `/ak:debug [problema]` | Diagnostica con hipótesis antes de proponer fixes |
| vibe-audit | `/ak:vibe-audit` | Auditoría completa de apps generadas con vibe coding |
| handoff | `/ak:handoff [foco]` | Compacta la sesión en un handoff para un agente nuevo |
| memory | `/ak:memory <save\|recall\|clean>` | Persiste, recupera y limpia lo que el proyecto ha aprendido |

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
npx ai-workflow-kit            # pregunta si global o por proyecto
```

O copia a mano — cada skill es un directorio con su `SKILL.md`:

```bash
cp -r skills/* ~/.claude/skills/
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
- `@commit`, `@pr`, `@review`, `@plan`, `@execute`, `@debug`, `@vibe-audit`
- `@frontend`, `@api`, `@test`, `@refactor`, `@docs`

### Usar con OpenAI Codex

Codex lee dos cosas: el `AGENTS.md` de la raíz del proyecto para las reglas, y `~/.codex/prompts/*.md` para los slash commands. El instalador hace ambas:

```bash
npx ai-workflow-kit --codex
```

Copia `codex-prompts/*.md` a `~/.codex/prompts/` (o `$CODEX_HOME/prompts/` si lo tienes definido) y deja el `AGENTS.md` en el proyecto actual. Reinicia Codex y tendrás:

- `/ak-commit`, `/ak-pr`, `/ak-review`, `/ak-plan`, `/ak-execute`, `/ak-debug`
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
2. Escribe tu skill en `src/skills/<id>.md` — la única fuente escrita a mano; `skills/`, `antigravity-skills/` y `codex-prompts/` se generan desde ella con `npm run build`. Los campos del spec y los gates (página de docs, cobertura de evals) están en [docs/authoring-skills.md](docs/authoring-skills.md).
3. Ejecuta `npm run build && npm test` — `build:check` falla con distribuciones editadas a mano o docs que faltan.
4. Abre un PR con `/ak:pr`

Antes de proponer una feature, revisa [`.out-of-scope/`](.out-of-scope/README.md) — un archivo por cosa que este repo decidió no construir, con el razonamiento.

## Filosofía

- **Diagnosticar antes de actuar** — un plan aprobado vale más que código rápido
- **Progreso demostrado** — una casilla se marca porque su comando salió con 0, nunca porque un agente lo afirme
- **Skills cross-tool** — los mismos patrones funcionan en Claude Code, Cursor, Copilot, Antigravity y Codex
- **Memoria persistente** — la IA debe recordar el contexto, no pedirlo cada vez
- **Output predecible** — cada skill produce el mismo formato, siempre
