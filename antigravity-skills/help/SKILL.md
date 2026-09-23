---
name: help
description: Point at the one skill that fits the task in hand, or say plainly that none of them does.
---

# Skill: @help

Route a task to the skill that fits it. Nobody keeps the whole set in their head; this is the index that means they don't have to.

## Task

what the user said they are trying to do

## The set

| Command | Invocation | What it does |
|---|---|---|
| @commit | user | Write a Conventional Commits message from the real staged diff, never from a guess at what changed. |
| @debug | model | Structured debugging workflow — diagnose before proposing fixes. Use when user says /ak-debug, reports a bug, an error, or unexpected behavior. Forms hypotheses before touching code. |
| @execute | user | Execute the next pending task of a specs/<slug>/ SDD feature — implement it, run its Verify command, and let the engine tick the box only on proof. |
| @handoff | user | Compact the current conversation into a handoff document for a fresh agent to continue the work. |
| @help | user | Point at the one skill that fits the task in hand, or say plainly that none of them does. |
| @memory | model | Manage persistent memory across sessions. Subcommands: save [topic] captures session learnings, recall [question] retrieves relevant context before acting, clean removes stale entries. Use when the user says /ak-memory, asks what was decided earlier, or when a session produces a learning worth keeping. |
| @plan | user | Plan a multi-file change into a resumable specs/<slug>/plan.md, and wait for approval before writing any code. |
| @pr | user | Open a Pull Request whose description, test plan, and checklist come from the branch's real commits and diff. |
| @review | model | Review code with real engineering criteria — logic bugs, security vulnerabilities, and technical debt. Use when the user says /ak-review, asks for a code review, or wants the branch diff checked before opening a PR. |
| @setup | user | Work out this repo's conventions — branch, commands, git host, commit style — and record them in .ak/config.md so the other skills stop guessing. |
| @vibe-audit | user | Audit an AI-generated app for the security, performance, and maintainability problems that vibe coding leaves behind. |

Skills marked **model** invocation can also fire on their own when a task obviously fits. The **user** ones only ever run because someone typed them — which is exactly why this skill exists.

## How to route

1. **If there is a task above**, name **one** skill. Not a shortlist — a shortlist hands the decision back to the person who asked precisely because they didn't want to make it.
2. Say in a sentence or two **why that one**, in terms of their task rather than the skill's blurb.
3. Give the **exact command to type**, arguments filled in from what they said:

   ```
   /ak-plan add JWT auth across the API, DB and frontend
   ```

4. Where a second skill is the obvious *next* step, name it as a next step — a chain, not an alternative. `/ak-plan` → `/ak-pr` → `/ak-review` is the common one.
5. **If there is no task above**, show the table and stop. Don't guess at what they might want.

## When nothing fits

Say so. "None of these covers that — it's a design question, not a workflow one" is a useful answer; steering someone into `/ak-review` because it was the nearest match is not.

The set covers a narrow band: git workflow, planning, debugging, auditing, and memory. Anything outside it is a normal conversation, and saying so costs the user nothing.

## Rules

- One recommendation. Ever.
- Never start the work. Routing is the whole job — the user runs the command themselves, and often not the one you named.
- Don't recommend `@help`.
