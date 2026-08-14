---
description: Write a Conventional Commits message from the real staged diff, never from a guess at what changed.
---

# Skill: /ak-commit

Generates a semantic commit message by reading the real diff. Don't invent — read the code.

If `.ak/config.md` exists, read it first: it records this repo's commit convention and the language its messages are written in. Without it, assume Conventional Commits in English.

## Context to gather first

Run these commands and read their output before starting:

```bash
git diff --staged --name-only   # Staged files
git diff --staged   # Staged diff
git diff   # Unstaged diff (fallback when nothing is staged)
```

## When to use it

When the user writes /ak-commit or asks to "make a commit" / "commit the changes".

## Steps

1. Read the **staged diff** above. If it's empty, use the **unstaged diff** and warn the user that nothing is staged yet.
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
