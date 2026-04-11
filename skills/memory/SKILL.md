---
name: ak:memory
description: Manage persistent memory across sessions. Subcommands: save [topic] captures session learnings, recall [question] retrieves relevant context before acting, clean removes stale entries.
argument-hint: <save|recall|clean> [topic or question]
---

# Skill: /ak:memory

Manages persistent memory across sessions. Captures, retrieves, and maintains what the AI needs to know to work effectively in this project without being told the same thing twice.

## Invocation

$ARGUMENTS

Route to the correct subcommand based on the first word of **Invocation**:
- Starts with `save` → run `/ak:memory save`
- Starts with `recall` → run `/ak:memory recall`
- Starts with `clean` → run `/ak:memory clean`
- Empty or unrecognized → show the three options and ask which to run

## When to use it

- `/ak:memory save [topic]` — capture learnings from the current session
- `/ak:memory recall [question]` — query relevant memory before acting
- `/ak:memory clean` — remove or update stale memories

---

## `/ak:memory save [topic]`

Persist useful context from the current session to the right memory file.

### Steps

1. **Identify what's worth saving.** Ask:
   - Was a non-obvious decision made? → `memory/decisions/`
   - Did a preferred approach or anti-pattern emerge? → `memory/feedback.md`
   - Was new business/domain context revealed? → `memory/project.md`
   - Did you learn something about the team's expertise or style? → `memory/user.md`

2. **Filter ruthlessly.** Do NOT save:
   - Things derivable from reading the code or git history
   - Temporary state or in-progress work
   - Facts already documented elsewhere (CLAUDE.md, READMEs)
   - Anything that won't change how you act in a future session

3. **Write to the right file** following the format in that file.
   - For decisions: create a new file in `memory/decisions/YYYY-MM-DD-title.md`
   - For everything else: append to the relevant section in the target file
   - Always include the date (YYYY-MM-DD)

4. **Update `memory/MEMORY.md`** if you added a new decisions file.

5. **Append an entry to `memory/CHANGELOG.md`** for every file touched:

```markdown
## YYYY-MM-DD — [Session topic or trigger]
**Action:** Added | Updated | Removed
**File:** memory/[file.md]
**Entry:** [Title or short description of what was changed]
**Why:** The reason this was worth persisting
```

6. **Confirm** to the user what was saved and where.

### Output format

```
Saved to memory/feedback.md:
- [Rule title]: [one-line summary of what was captured]

Saved to memory/decisions/2026-04-11-auth-strategy.md:
- New ADR: JWT refresh token rotation chosen over sessions

Logged in memory/CHANGELOG.md.
```

---

## `/ak:memory recall [question]`

Surface relevant memory before starting a task, to avoid repeating past mistakes or contradicting prior decisions.

### Steps

1. Read `memory/MEMORY.md` to get the index.
2. Based on the question or task, identify which memory files are relevant.
3. Read those files and extract the specific entries that apply.
4. Present findings concisely — only what's relevant to the current task.

### Output format

```
Relevant memory for [task]:

From feedback.md:
- Don't mock the database in tests (2026-03-10)

From project.md:
- Pessimistic updates required on payment flows (2026-03-10)

No prior decisions found for [specific aspect].
```

If no relevant memory exists: say so clearly and proceed without fabricating context.

---

## `/ak:memory clean`

Remove or update memories that are outdated, wrong, or no longer useful.

### Steps

1. Read all files in `memory/`.
2. For each entry, evaluate:
   - **Outdated?** — Does the code/stack/team no longer match this?
   - **Superseded?** — Was a newer decision made that replaces this?
   - **Too vague?** — Does it not actually change how you'd act?
   - **Duplicated?** — Is it already captured better somewhere else?
3. For each problematic entry:
   - **Fix it** if it just needs updating
   - **Remove it** if it's no longer relevant
   - **Mark it** with `> ⚠️ Review needed:` if unsure and let the user decide
4. **Append a summary entry to `memory/CHANGELOG.md`** with action `Updated` or `Removed` for each change made.
5. Report what changed.

### Output format

```
Memory audit complete:

Updated:
- feedback.md > "No trailing summaries" — clarified scope

Removed:
- project.md > "Use Redux for state" — project migrated to Zustand in Feb 2026

Flagged for review (unchanged, needs your decision):
- user.md > "Team is new to TypeScript" — is this still accurate?
```

---

## Rules

- Memory is only as useful as it is accurate. A wrong memory is worse than no memory.
- When in doubt about whether to save something, ask: "Would a future session benefit from knowing this?" If yes, save it.
- Never save secrets, credentials, or sensitive data to memory files.
- Memory files are committed to the repo — treat them as shared team knowledge.
