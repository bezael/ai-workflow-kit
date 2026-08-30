# Tasks — Feedback voting

> Derived from `spec.md` + `plan.md`. Execute tasks in strict order.

## Phase 1 — Module votes

- [x] 🔴 **Test: vote toggle** — files: `tests/votes.test.js`. Criterion: `spec.md §3 AC-01`. Must FAIL when run.
      Verify: `npm test -- votes`
- [x] 🟢 **Implement vote toggle** — files: `src/votes.js`. Criterion: `spec.md §3 AC-01`. Makes the red test pass.
      Verify: `npm test -- votes`
- [x] 🟢 **Expose distinct vote count** — files: `src/votes.js`. Criterion: `spec.md §3 AC-02`.
      Verify: `npm test -- votes`
- [ ] 🟢 **Reject self-votes** — files: `src/votes.js`. Criterion: `spec.md §3 AC-03`.
      Verify: `npm test -- votes`
