# Stop committing the generated skill files and build them at install time

`skills/`, `antigravity-skills/`, and `codex-prompts/` are rendered from `src/skills/*.md` and then **committed**. Requests to gitignore them and render at install time — or in a `prepublishOnly` hook — are out of scope.

## Why this is out of scope

The installers read the distributions directly, and several of the install paths never run a build step at all:

- `install.sh` copies files out of a cloned or downloaded tree.
- `npx ai-workflow-kit` runs against the published tarball, where `devDependencies` (including the `yaml` parser the builder needs) are not installed.
- A user browsing `skills/ak-commit/SKILL.md` on GitHub is reading the artifact they will actually get. That is the point of committing it.

Generating at install time would mean shipping the builder and its dependencies to every consumer to reproduce a file that is deterministic anyway.

The usual objection to committed build output — that it drifts from source — is already handled: `npm run build:check` re-renders everything and fails on any difference, and it runs in CI ahead of the tests. See `scripts/build-skills.js` and the `build:check` script in `package.json`.

## What to do instead

Edit `src/skills/<id>.md` and run `npm run build`. If you hand-edited a generated file, CI will tell you exactly which one. See [docs/authoring-skills.md](../docs/authoring-skills.md).
