---
id: help
name: help
description: >-
  Point at the one skill that fits the task in hand, or say plainly that none
  of them does.
invocation: user
argument-hint: "[what you are trying to do]"
args_fallback: what the user said they are trying to do

contract:
  - Recommends exactly one skill, never a shortlist
  - Gives the exact command to type
  - Says plainly when no skill fits, instead of forcing a match
  - Does not start doing the task itself
  - Lists the whole set only when the user gave no task

acceptance:
  threshold: 0.8
  cases:
    - name: finished work, wants a PR
      input: I've finished the feature branch and want to get it reviewed.
      vars: { expected: "/ak-pr" }
    - name: something is broken
      input: The login button does nothing when I tap it on mobile.
      vars: { expected: "/ak-debug" }
    - name: large multi-file change
      input: I need to add JWT auth across the API, the database and the frontend.
      vars: { expected: "/ak-plan" }
    - name: nothing fits
      input: What colour should the primary button be?
      vars: { expected: "no skill — it says plainly that none of them fits" }
  criteria:
    - The answer is {{expected}}
    - It commits to a single answer rather than listing candidates to choose between
    - It gives the exact command to type, or says plainly that no skill fits
    - It explains in a sentence or two why, rather than just naming the skill
    - It does not start performing the task itself

targets:
  claude: {}
  antigravity: {}
  codex: {}
---

# Skill: {{invoke}}

Route a task to the skill that fits it. Nobody keeps the whole set in their head; this is the index that means they don't have to.

## Task

{{args}}

## The set

{{catalogue}}

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
- Don't recommend `{{invoke}}`.
