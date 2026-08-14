---
id: plan
name: plan
description: >-
  Plan before executing. Use when task touches 3+ files, requires new folder
  structure, involves DB or API changes, or has step dependencies. Waits for
  approval before writing code.
argument-hint: "<task description>"

contract:
  - Plan states the goal in one line
  - Every file that will change is listed, with what changes in it
  - Steps are ordered and concrete enough to execute without further questions
  - Risks and rejected alternatives are named
  - Out-of-scope items are stated explicitly
  - No code is written before the user approves

acceptance:
  threshold: 0.8
  pending: no fixture yet — needs a sample codebase plus a task description
  criteria:
    - Produces all five sections: Goal, Files to be touched, Steps, Risks, Not included
    - Goal is a single sentence, not a restatement of the whole task
    - Every listed file is one that actually exists or is explicitly marked [new]
    - Steps are ordered and each names a concrete action
    - Asks at most one clarifying question before proposing the plan
    - Does not begin implementing before approval

targets:
  claude:
    frontmatter:
      disable-model-invocation: true
  antigravity: {}
  codex: {}
---

# Skill: {{invoke}}

Plan before executing. For complex tasks that touch multiple files or require architecture decisions.

## Task to plan

{{args}}

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

7. **After implementation**: run the review skill on the changed files before considering the task complete.

## Rules

- A plan is a contract. Execute exactly what was approved.
- Prefer small iterative plans over large complete ones.
- One clarifying question max — don't interview the user.
