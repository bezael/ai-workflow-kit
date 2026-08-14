---
id: handoff
name: handoff
description: >-
  Compact the current conversation into a handoff document for a fresh agent
  to continue the work.
argument-hint: "[focus of the next session]"

contract:
  - Document is self-contained — a fresh agent needs only this file to start
  - Existing artifacts are referenced by path or URL, never duplicated
  - An in-flight specs/<slug>/plan.md is named as the place progress lives
  - Open threads and blockers are named explicitly
  - Secrets and PII are redacted
  - Written to the OS temp directory, not the workspace

acceptance:
  threshold: 0.8
  pending: no fixture yet — needs a recorded session transcript to compact
  criteria:
    - Produces all sections: Where we left off, Open threads, Key decisions, Artifacts, Context
    - References existing artifacts by path instead of restating their contents
    - Points at any in-flight specs/<slug>/plan.md rather than re-listing its steps
    - Names at least one concrete next action
    - Contains no credentials, API keys, or personal data
    - Writes to the OS temp directory rather than the current workspace

targets:
  claude:
    frontmatter:
      disable-model-invocation: true
  antigravity: {}
  codex: {}
---

# Skill: {{invoke}}

Compact the current conversation into a handoff document so a fresh agent can continue without losing context.

## Focus of next session

{{args}}

## Steps

1. **Survey what exists**: Scan for artifacts already captured elsewhere — `specs/*/plan.md`, PRDs, ADRs, issues, commits, diffs. Reference them by path or URL; do not duplicate their content.

   If a `specs/<slug>/plan.md` is mid-execution, that file — not this document —
   is where step-by-step progress lives. Name it, say which step is next, and
   stop there. Re-listing its checkboxes here creates a second copy that goes
   stale the moment either one is edited.

2. **Write the handoff document** with these sections:

```markdown
# Handoff: [date] — [focus or "continuation"]

## Where we left off
[1-3 sentences on current state and what was just completed or decided]

## Open threads
- [Decision or task not yet resolved]
- [Blocked item and what's blocking it]

## Key decisions made this session
- [Decision] — [why, in one line]

## Artifacts to read first
- `specs/<slug>/plan.md` — [approved plan, N of M steps done, next: step N+1]
- `path/to/file.md` — [what it contains]
- Issue #42 — [what it tracks]

## Suggested next steps
- [Concrete action the next agent should take first]

## Context the next agent needs but isn't in the code
[Anything non-obvious: constraints, stakeholder preferences, things tried and abandoned]
```

3. **Save to the OS temp directory** — not the current workspace.
   - Windows: `%TEMP%\handoff-[timestamp].md`
   - macOS/Linux: `/tmp/handoff-[timestamp].md`

4. **Report the path** to the user and optionally copy the key sections to the conversation for immediate use.

## Rules

- Do not duplicate content already in PRDs, issues, or commits. Reference them.
- Redact secrets, API keys, and PII.
- If the user passed arguments, treat them as the focus of the next session and tailor the doc accordingly.
- The document should be self-contained: a fresh agent reading only this file should know where to start.
