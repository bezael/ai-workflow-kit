# The canonical install block

One install story, one wording. Every place that tells a user how to install the kit gets its text from here.

Change it **here** and run `npm run build` — the blocks are injected into the marked regions of `README.md` and `README.es.md`, and `npm run build:check` fails if a copy has been hand-edited. `scripts/sync-docs.js` does the injection.

Placeholders resolved at injection time:

| Placeholder | Source |
|---|---|
| `{{version}}` | `package.json` |
| `{{commands}}` | `src/manifest.json` (skills) + `agents/` — so a new skill can't be left out of the list |
| `{{hooks}}` | count of `hooks/*.sh` |

The `--flag` set has to match across languages; a flag documented in one README and not the other fails the check.

---

<!-- block: quickstart.en -->
```bash
npx ai-workflow-kit
```

Or pin a version as a dev dependency (it's a dev tool, not a runtime dependency):

```bash
npm i -D ai-workflow-kit@{{version}}
npx ai-workflow-kit
```

Restart your AI tool. You'll have {{commands}} available — plus {{hooks}} automatic hooks.

```bash
npx ai-workflow-kit --global   # install into ~/.claude/ — all projects (default)
npx ai-workflow-kit --local    # install into .claude/ — this project only
npx ai-workflow-kit --skills   # skills and agents only
npx ai-workflow-kit --hooks    # hooks only
npx ai-workflow-kit --yes      # no confirmations
npx ai-workflow-kit --list     # see what would be installed
npx ai-workflow-kit --uninstall
```
<!-- endblock -->

<!-- block: quickstart.es -->
```bash
npx ai-workflow-kit
```

O fija una versión como dependencia de desarrollo (es una herramienta de desarrollo, no una dependencia de runtime):

```bash
npm i -D ai-workflow-kit@{{version}}
npx ai-workflow-kit
```

Reinicia tu herramienta de AI. Tendrás disponibles {{commands}} — más {{hooks}} hooks automáticos.

```bash
npx ai-workflow-kit --global   # instala en ~/.claude/ — todos los proyectos (por defecto)
npx ai-workflow-kit --local    # instala en .claude/ — solo este proyecto
npx ai-workflow-kit --skills   # solo skills y agentes
npx ai-workflow-kit --hooks    # solo hooks
npx ai-workflow-kit --yes      # sin confirmaciones
npx ai-workflow-kit --list     # ver qué se instalaría
npx ai-workflow-kit --uninstall
```
<!-- endblock -->
