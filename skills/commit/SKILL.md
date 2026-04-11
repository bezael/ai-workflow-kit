---
name: ak:commit
description: Generate a semantic commit message by reading the real staged diff. Use when the user says /commit, "make a commit", or "commit the changes". Never invents — reads the actual diff.
disable-model-invocation: true
allowed-tools: Bash(git *)
---

# Skill: /commit

Generates a semantic commit message by reading the real diff. Don't invent — read the code.

## Context

- Staged files: !`git diff --staged --name-only`
- Staged diff: !`git diff --staged`
- Unstaged diff (if nothing staged): !`git diff`

## When to use it

When the user writes `/commit` or asks to "make a commit" / "commit the changes".

## Steps

1. Read the **Staged diff** above. If it's empty, use the **Unstaged diff** and warn the user that nothing is staged yet.
2. Read the full diff. Identify:
   - **What changed** (files, functions, logic)
   - **Why it probably changed** (new feature, fix, refactor, docs, etc.)
3. Classify the commit type:
   - `feat:` — new functionality
   - `fix:` — bug fix
   - `refactor:` — code change without behavior change
   - `chore:` — maintenance tasks (deps, config, scripts)
   - `docs:` — documentation only
   - `test:` — tests only
   - `style:` — formatting, whitespace, semicolons (no logic)
4. Draft the message in the format: `type(optional scope): imperative description`
   - Maximum 72 characters on the first line
   - In English by default
   - Optional body if the change needs more context
5. Propose the message and ask if it's good or needs adjustments before running the commit.

## Example output

```
feat(auth): add JWT refresh token rotation

Tokens now rotate on each refresh request to reduce exposure window.
Invalidates old token immediately after issuing new one.
```

## Rules

- NEVER commit `.env` files, credentials, or secrets.
- If you see sensitive files in staged, warn before continuing.
- If the diff is large and mixes concerns, suggest splitting it into multiple commits.
