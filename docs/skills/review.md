# /ak:review

## What it does

Reviews a file, or the current branch diff, against real engineering criteria — logic bugs, security holes, race conditions, missing error handling, performance traps — and reports them grouped by severity with a line number attached to each.

Every finding has to cite the line or snippet it came from. A review that says "consider improving error handling" is unactionable; one that says "line 47: the `catch` returns `err` straight to the client" is a fix. The citation requirement is what forces the second kind.

## When to reach for it

Type `/ak:review @path/to/file`, or `/ak:review` on its own to review the branch diff. The agent can also reach for it when you ask for a code review.

Reach for it before opening a PR, or on a file you've just changed heavily. For code nobody has ever reviewed — a whole AI-generated app — [`/ak:vibe-audit`](vibe-audit.md) is the wider sweep. For a specific misbehaviour rather than a general read, [`/ak:debug`](debug.md).

## Severity is a decision, not a label

Three buckets, and the boundary between them is what to *do*:

| | Means |
|---|---|
| Critical | blocks merge — logic bugs, injection, XSS, auth bypass, races, leaks |
| Important | fix now or as a tracked follow-up — missing error handling, edge cases, N+1 queries, untested critical logic |
| Suggestion | optional — naming, duplication, readability |

Every Critical carries a concrete fix, not just a description of the problem. And the output ends with one or two things the code does well — not politeness, but calibration: a review that only ever finds fault stops being read carefully.

## Requirements compliance, when a spec exists

If a `specs/<slug>/` directory covers the change (an SDD feature — `spec.md` + `plan.md` + `tasks.md`, written by a spec tool such as sdd-creator), the review grows a first layer *above* the technical one. It reads the spec before judging a line, then opens with `Status: PASS | CHANGES REQUIRED` and a **Requirements compliance** section:

- acceptance criteria implemented, missing, or diverging — with evidence
- tasks marked `[x]` whose implementation doesn't actually satisfy their criterion
- code no criterion asked for (out of scope)
- criteria with no test or `Verify:` coverage

The point is intention vs implementation: passing tests are evidence, not a verdict. A task list can be fully ticked and still not do what the spec says — this layer is where that gets caught. Without a `specs/` directory, nothing changes.

The compliance layer closes with an **alignment verdict** — `Exact`, `Tangling` (code no criterion asks for), `Missing` (requirements not fully covered), or `Missing and Tangling` — the PR-issue alignment taxonomy from agentic code review research (Isik et al.). Only `Exact`, or a deviation the user explicitly accepted, can be part of a `PASS`.

## Depth goes where history says defects cluster

Before the severity pass, the review runs `npx ai-workflow-kit risk`: a deterministic ranking of the changed files by churn and fix history from git — no LLM, one `git log` aggregated per file. `HIGH` files get the deep read first. A file with no history shows as `new`, which means unknown risk, not low. The signal orders the review; it is never itself a finding — a `HIGH` label with no defect found is a clean result.

## The review ends by remembering

A review that surfaces a durable learning — a decision confirmed or overturned, an alternative rejected with its reason, a risk that materialized in a specific module — offers to persist it to `memory/decisions/` via [`/ak:memory`](memory.md). Pure code fixes stay in the review; only durable knowledge is promoted. The next review starts from what this one learned instead of rediscovering it.

## It's working if

- Each finding names a line you can jump to.
- The Critical list is short and everything on it would genuinely block a merge.
- You disagree with a Suggestion occasionally — that means it's reading the code rather than pattern-matching a checklist.
- It runs read-only. It reports; it doesn't start editing.

## Where it fits

A chain step just before the PR — [`/ak:plan`](plan.md) → work → [`/ak:commit`](commit.md) → `/ak:review` → [`/ak:pr`](pr.md) — and a standalone you can point at any file.

If [`/ak:setup`](setup.md) has run, it diffs against the base branch `.ak/config.md` recorded, and can quote lint and typecheck output as evidence rather than opinion.

[`/ak:help`](help.md) routes across the whole set when you're not sure which skill a task wants.
