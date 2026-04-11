# Skill: plan

Plan before executing. For complex tasks that touch multiple files or require architecture decisions.

## Trigger

When the user writes `@plan [task]` or when the task:
- Touches more than 3 files
- Requires creating new folder structure
- Involves database or API changes
- Has dependencies between steps

## Steps

1. **Understand the goal**: Read the user's task. If ambiguous, ask ONE clarifying question before continuing.

2. **Explore the relevant codebase**:
   - Read files related to the task
   - Identify existing patterns (how something similar is already done)
   - Detect dependencies and risks

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

4. **Wait for approval** before executing any changes. Don't start writing code until the user says "go ahead" or similar.

## Rules

- A plan is a contract. If the user approves, execute exactly what you said.
- If during execution you discover something that changes the plan, stop and report.
- Prefer small iterative plans over large complete ones.
