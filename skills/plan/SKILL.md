---
name: ak:plan
description: Plan before executing. Use when task touches 3+ files, requires new folder structure, involves DB or API changes, or has step dependencies. Waits for approval before writing code.
disable-model-invocation: true
argument-hint: <task description>
---

# Skill: /plan

Plan before executing. For complex tasks that touch multiple files or require architecture decisions.

## Task to plan

$ARGUMENTS

## Steps

1. **Understand the goal**: Read the user's task. If ambiguous, ask ONE clarifying question before continuing.
   _Done when: the goal fits in one sentence._

2. **Explore the relevant codebase**:
   - Read files related to the task
   - Identify existing patterns (how something similar is already done)
   - Detect dependencies and risks
   _Done when: every file that will change has been read._

3. **Propose a structured plan**:

```markdown
## Plan: [task name]

### Goal
[One line describing what will be achieved]

### Files to be touched
- `path/file.ts` — [what change]
- `path/other.ts` — [what change]
- [new] `path/new.ts` — [what it does]

### Steps in order
1. [First concrete step]
2. [Second step]
3. [...]

### Risks / decisions
- [Risk or trade-off the user should know about]
- [Alternative considered and why it wasn't chosen]

### Not included in this plan
- [What's out of scope and why]
```

4. **Wait for approval** before executing any changes.
   _Done when: user explicitly approves ("go ahead", "looks good", etc.)._

5. **Mark the ticket InProgress**: if the task is linked to an issue or ticket, mark it as `in_progress` now — before writing any code.

6. **Execute** the plan exactly as approved. If you discover something that changes the plan, stop and report.

7. **After implementation**: run `/ak:review` on the changed files before considering the task complete.

## Rules

- A plan is a contract. Execute exactly what was approved.
- Prefer small iterative plans over large complete ones.
- One clarifying question max — don't interview the user.
