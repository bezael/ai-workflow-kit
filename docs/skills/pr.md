# /ak:pr

## What it does

Opens a Pull Request whose description, test plan, and reviewer checklist are built from the branch's real commits and diff. It proposes the title and body, waits for your approval, then runs `gh pr create`.

Nothing in the body may describe a change that isn't in the diff. A PR description is the thing reviewers read instead of the code, so an invented bullet doesn't just mislead — it redirects the review away from the part that needed looking at.

## When to reach for it

You invoke this by typing `/ak:pr` — the agent won't reach for it on its own. An optional argument becomes the title: `/ak:pr feat: add JWT refresh`.

Reach for it when the branch is finished and pushed. For a single commit's message rather than a branch's, use [`/ak:commit`](commit.md); to have the code looked at before you open the PR, [`/ak:review`](review.md) first.

## Prerequisites

A branch with commits ahead of the base, and `gh` installed and authenticated. Without `gh` it still writes the full title and body for you to paste into GitHub by hand — the drafting works, only the last step doesn't.

One wrinkle worth knowing: `gh pr create` runs *after* you confirm, which is a later turn than the one that invoked the skill. A frontmatter tool grant has expired by then, so the allow rule for `gh` belongs in your permission settings rather than the skill.

## Four sections, all load-bearing

The body is always **What / Main changes / Test plan / Notes for the reviewer**, and each earns its place:

| Section | What makes it good |
|---|---|
| What does this PR do? | the *why*, in one to three bullets — not a restatement of the diff |
| Main changes | one line per file or module, each naming something in the diff |
| Test plan | at least one case a reviewer could actually run |
| Notes for the reviewer | trade-offs, decisions, the thing you'd say out loud at their desk |

If the branch mixes concerns, the skill says so. It may *offer* a split — but only when the split is provably safe (see below), and never without asking.

## Review focus: where the human looks first

Not every file in a PR deserves the same attention: four `.md` files and one auth change should not get the same review budget. So the body carries a **Review focus** table — one row per changed file, with a review need and the reason for it — and a `Human review required: yes | no` line above it.

| Need | File | Why |
|---|---|---|
| HIGH | `src/auth/session.ts` | sensitive path: `src/auth/**`; 4 fix commits in 6m |
| MEDIUM | `src/api/users.ts` | new code, unknown risk |
| LOW | `docs/auth.md` | docs only |

The level comes from `npx ai-workflow-kit risk --focus`, which is deterministic and unit-tested, so it is the same in Claude Code, Antigravity and Codex. Three sources feed it, in priority order:

1. **Sensitive paths** declared under `## Review` in `.ak/config.md` by [`/ak:setup`](setup.md) — always HIGH, and the reason names the glob that matched. A threat-model `.md` under `docs/auth/**` is HIGH even though it's documentation.
2. **File kind** — docs, lockfiles and fixtures are LOW. Tests are *not* forced LOW: a weakened assertion is a real risk, so they keep their history level.
3. **Fix history** — the `risk` signal's `high` / `medium` / `low` map straight across, and `new` maps to MEDIUM: no history is unknown risk, not low.

Three levels with a stated reason, not a 0–100 score: a number invites false precision and arguments about thresholds, while "sensitive path" or "docs only" is something a reviewer can act on. The level orders attention; it is never itself a finding — a HIGH file with nothing wrong in it is a clean result.

When the focus says yes, the skill suggests a `needs-human-review` label (`low-risk` otherwise), and applies it with `gh pr create --label` only if `gh label list` shows it exists. It never creates labels.

Without `npx`, the skill estimates the levels by hand (sensitive glob → HIGH, docs/lockfiles → LOW, then `fix:` commits per file) and says so in the body.

### Why one PR, not one per level

Splitting by risk level produces PRs that aren't logical units: the docs describe code that isn't merged yet, or the auth change ships undocumented, and stacked PRs must be rebased in order. The attention gain lives in the table. A split is offered only when *all* of these hold: the LOW group is whole files (never hunks), no LOW file references a symbol the HIGH files change, and the "What" bullets genuinely carry more than one concern. Otherwise the PR stays one, with the reason in the notes.

## Traceability, when a spec exists

If a `specs/<slug>/` directory covers the branch (an SDD feature), the body is enriched: a **Specification** link, the acceptance criteria this branch implements, a **Verification** section, and a **Traceability** line (Issue → Spec → Tasks → Implementation → Verification), plus **Risks / out of scope**.

The Verification section only reports what actually ran — ideally the output of `npx ai-workflow-kit verify <slug> --final`. A check that wasn't executed appears as `not run`, never as an optimistic PASS. Ordinary branches without specs keep the four-section body unchanged.

## It's working if

- Every entry under **Main changes** points at a file you recognise from the diff.
- The test plan contains something you could execute, not "tested manually".
- The title is a valid Conventional Commits subject under 72 characters.
- Every changed file has a row in **Review focus**, HIGH rows first, each with a reason you could check.
- `Human review required: yes` appears exactly when at least one file is HIGH.
- You get asked before `gh pr create` runs, and before any split.

## Where it fits

A chain step, and normally the last one: [`/ak:plan`](plan.md) → work → [`/ak:commit`](commit.md) → [`/ak:review`](review.md) → `/ak:pr`.

If [`/ak:setup`](setup.md) has run, the base branch and the git host come from `.ak/config.md` rather than assuming `main` on GitHub — and so do the sensitive paths that make a file HIGH in the focus table.

[`/ak:help`](help.md) routes across the whole set when you're not sure which skill a task wants.
