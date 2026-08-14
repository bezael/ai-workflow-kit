# Put a skill's asset files next to its Codex prompt

A skill can carry auxiliary files — `vibe-audit` has `patterns.md`. For Claude Code and Antigravity these sit beside the `SKILL.md` in the skill's own directory. For Codex they do not, and requests to place them next to `codex-prompts/ak-<id>.md` are out of scope.

## Why this is out of scope

Codex prompts are **flat files in one directory**, and every `.md` in `~/.codex/prompts/` registers as a slash command. An asset dropped beside the prompt would appear in the user's command list as a phantom command — `/patterns` — that does nothing when invoked.

This is a property of how Codex discovers prompts, not a choice this repo can make differently. The builder encodes it: the `codex` target sets `assets: false`, and the installers copy assets to `$CODEX_HOME/ak-workflow-kit/` instead. See `scripts/build-skills.js`.

## What to do instead

Reference the asset by its installed path, varying the wording per target. `src/skills/vibe-audit.md` does this with a `patterns_ref` placeholder — each target under `targets:` supplies its own string, and the body writes `{{patterns_ref}}`. Any scalar under `targets.<name>` becomes a placeholder, so a skill can vary a phrase per target without the builder knowing about it.
