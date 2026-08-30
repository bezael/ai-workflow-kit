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

If the branch mixes concerns, the skill says so and suggests splitting rather than writing a "What" bullet with an *and* in it.

## Traceability, when a spec exists

If a `specs/<slug>/` directory covers the branch (an SDD feature), the body is enriched: a **Specification** link, the acceptance criteria this branch implements, a **Verification** section, and a **Traceability** line (Issue → Spec → Tasks → Implementation → Verification), plus **Risks / out of scope**.

The Verification section only reports what actually ran — ideally the output of `npx ai-workflow-kit verify <slug> --final`. A check that wasn't executed appears as `not run`, never as an optimistic PASS. Ordinary branches without specs keep the four-section body unchanged.

## It's working if

- Every entry under **Main changes** points at a file you recognise from the diff.
- The test plan contains something you could execute, not "tested manually".
- The title is a valid Conventional Commits subject under 72 characters.
- You get asked before `gh pr create` runs.

## Where it fits

A chain step, and normally the last one: [`/ak:plan`](plan.md) → work → [`/ak:commit`](commit.md) → [`/ak:review`](review.md) → `/ak:pr`.

If [`/ak:setup`](setup.md) has run, the base branch and the git host come from `.ak/config.md` rather than assuming `main` on GitHub.

[`/ak:help`](help.md) routes across the whole set when you're not sure which skill a task wants.
