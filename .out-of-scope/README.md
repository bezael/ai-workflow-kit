# Out of scope

One file per feature this repo has decided **not** to build, with the reasoning.

A rejected request that lives only in a closed issue gets re-litigated every few months — by a contributor who never saw the thread, or by an agent reading the codebase. A file here is the durable answer: link it, close the issue, move on.

## When to write one

Write a file when a request is declined **on design grounds** — the thing conflicts with how the kit works, or the cure is worse than the disease. Do not write one for a request that is merely unscheduled; that is a backlog issue, and calling it out of scope forecloses a decision nobody has made yet.

## Format

```markdown
# <The thing, stated as the requester would state it>

<One paragraph: what is out of scope, in plain terms.>

## Why this is out of scope

<The reasoning. Name the constraint it collides with. Where the code already
encodes the decision, link the file so the two cannot drift.>

## What to do instead

<The escape hatch. Nearly every rejected request has one — say what it is.>

## Prior requests

- #<n> — "<the requester's own words>"
```

Add the `Prior requests` entry as each one arrives; a request filed twice is a sign the reasoning belongs somewhere more visible than here. Omit the section while no one has asked.

## Current decisions

| Decision | Short version |
|---|---|
| [generated-skill-files-are-committed](generated-skill-files-are-committed.md) | The three distributions stay in git; they are not built at install time |
| [codex-assets-beside-the-prompt](codex-assets-beside-the-prompt.md) | Codex asset files cannot live next to the prompt that references them |
| [one-way-eval-coverage-allowlist](one-way-eval-coverage-allowlist.md) | The coverage allowlist fails in both directions, and will keep doing so |
