---
name: ak:handoff
description: Compact the current conversation into a handoff document for a fresh agent to continue the work.
disable-model-invocation: true
argument-hint: "[focus of the next session]"
---

# Skill: /handoff

Compact the current conversation into a handoff document so a fresh agent can continue without losing context.

## Focus of next session

$ARGUMENTS

## Steps

1. **Survey what exists**: Scan for artifacts already captured elsewhere — PRDs, plans, ADRs, issues, commits, diffs. Reference them by path or URL; do not duplicate their content.

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
- `path/to/file.md` — [what it contains]
- Issue #42 — [what it tracks]

## Suggested skills for next session
- `/ak:plan` — [why it's relevant]
- `/ak:debug` — [why it's relevant]

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
