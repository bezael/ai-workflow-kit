# A /ak:changelog skill that generates CHANGELOG entries from git history

Out of scope: a skill that reads the commits since the last tag and writes a
grouped `## [version] - date` section into `CHANGELOG.md`.

## Why this is out of scope

Changelog generation from conventional commits is deterministic — group by
type, format, prepend. Deterministic work belongs to a script, not to a
prompt: a script gives the same output twice, costs no tokens, and can run in
CI. This repo already encodes that decision in
[`scripts/release.js`](../scripts/release.js), which does precisely what the
request describes (commits since last tag → Added/Changed/Fixed → CHANGELOG)
as part of `npm run release:*`.

For user projects, the same niche is served full-time by dedicated release
tooling (changesets, release-please, semantic-release), which also handles the
parts a skill could not — version bumping, tagging, CI publishing. A skill
would be the worst of both: non-deterministic where determinism is the whole
point, and shallower than the tools teams already run.

## What to do instead

In this repo: `npm run release:patch|minor|major` — the changelog entry is
part of the release. In your own project: adopt the ecosystem's release
tooling; if you just want prose written from a diff or log once, `/ak:commit`
and `/ak:pr` already turn real git history into text where judgment (not
formatting) is the work.

## Prior requests

- #3 — "Add a `/ak:changelog` skill that reads the git log since the last tag and generates a structured `CHANGELOG.md` entry"
