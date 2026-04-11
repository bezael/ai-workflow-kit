---
name: ak:vibe-audit
description: Audit AI-generated apps for security, performance, and maintainability issues. Use when user says /vibe-audit or "I generated this with AI and want to know how bad it is".
disable-model-invocation: true
argument-hint: [@folder or leave empty for current project]
context: fork
agent: Explore
---

# Skill: /vibe-audit

Audit of apps built with vibe coding. Detects the typical problems AI generated without anyone reviewing them: security, performance, maintainability, and accumulated technical debt.

## Target

$ARGUMENTS

If **Target** is empty, audit the current project root. If a folder path is provided, scope the audit to that folder only.

## When to use it

When the user writes `/vibe-audit` or `/vibe-audit @folder`.
Also useful when someone says "I generated this with AI and want to know how bad it is".

## What this skill does first

1. Scans the complete project structure (folders, main files) starting from **Target**
2. Reads the most critical files: entry point, routes/endpoints, main components, config
3. Checks each of the 20 risk patterns documented in [patterns.md](patterns.md)
4. Generates a report with severity, concrete evidence, and suggested fix

See [patterns.md](patterns.md) for the complete list of patterns — what to look for, the risk, and the fix for each one. Load it before starting the audit.

---

## Report format

```markdown
# Vibe Audit — [project name]
Audited: [date]

## Summary
- 🔴 Critical: N  (block production or are security risks)
- 🟡 Important: N (affect stability or maintainability)
- 🔵 Improvements: N    (technical debt, quality)

---

## 🔴 Critical

### [Problem name]
**Where:** `path/file.ts` line X
**Evidence:**
[problematic code]
**Risk:** [what can happen if not fixed]
**Suggested fix:**
[corrected code or concrete steps]

---

## 🟡 Important
[same format]

---

## 🔵 Improvements
[same format]

---

## What's good
[1-3 things vibe coding did well — balanced feedback is more actionable]

## Suggested action plan
1. [This first — the most urgent critical]
2. [Then this]
3. [...]
```

## Rules

- **Be specific**: cite the file and line, don't say "there's a security problem" without showing where.
- **One problem at a time if the user wants to fix them**: don't generate 50 fixes at once. Offer to fix them in priority order.
- **Don't rewrite the app**: the goal is to identify and fix existing problems, not redo everything with "best practices".
- **If the project is large**: audit by module (auth, API, frontend) instead of everything at once.
