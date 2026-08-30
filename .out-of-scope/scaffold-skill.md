# A /ak:scaffold skill that generates project boilerplate from a stack description

Out of scope: a skill that takes "React + TypeScript + Tailwind + Vitest" and
produces a ready-to-use folder structure, `package.json`, and starter config.

## Why this is out of scope

The kit drew a boundary in v2.4.0: **spec tooling owns creation, the kit owns
execution**. A new project or feature goes spec → plan → tasks (sdd-creator or
equivalent), and the generated task list's Phase 0 already *is* the scaffold —
initialize the manifest, configure the runner and linter, create the folder
structure per `plan.md`, each step with a `Verify:` command. A scaffold skill
would be a second, spec-less entry point to the same outcome, which is exactly
the competing workflow [`src/skills/plan.md`](../src/skills/plan.md) Step 0
exists to prevent ("recommend the spec-first flow — a one-file plan is the
wrong artifact for that").

There is also a flat capability argument: `npm create vite`, `create-next-app`
and their peers do stack-specific boilerplate better than a prompt can, and
chase their ecosystems full-time. The kit adding a worse copy of them buys
nothing.

## What to do instead

Start the feature in your spec tool — the task list it emits scaffolds the
project as verified Phase 0 tasks, and `npx ai-workflow-kit verify <slug>`
proves each one. For bare boilerplate with no spec, use the ecosystem's own
generator (`npm create vite@latest`, …) and then `/ak:setup` to record the
resulting conventions in `.ak/config.md`.

## Prior requests

- #1 — "Add a new `/ak:scaffold` skill that generates project boilerplate based on a stack description"
