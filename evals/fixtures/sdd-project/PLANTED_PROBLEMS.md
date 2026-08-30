# Planted problems — sdd-project fixture

An SDD feature (`specs/feedback-voting/`) whose implementation drifted from
its spec. Used by the review eval to check the requirements-compliance layer:
the review must compare intention (spec) with implementation (code), not trust
the `[x]` marks. This file is the answer key — never show it to the model
under test.

## Compliance violations

1. **AC-01 marked done, toggle not implemented.** `tasks.md` ticks the
   vote-toggle tasks, but `vote()` in `src/votes.js` only appends: a second
   vote from the same user is added again instead of removing the first one.
2. **AC-02 broken as a consequence.** `voteCount()` returns the raw list
   length, so duplicate votes from one user inflate the count — it is not the
   number of distinct users.
3. **Out-of-scope code.** `downvote()` and `trackAnalytics()` (with a network
   call) exist in `src/votes.js`; no acceptance criterion asks for either.

## Not a violation

4. **AC-03 unimplemented but unchecked.** The self-vote rejection task is
   still `[ ]` — that is remaining work, not a compliance failure. The review
   should note it (missing coverage), not condemn it.

## Expected review outcome

`Status: CHANGES REQUIRED`, with a Requirements compliance section naming
1-3 and a missing-tests/verification-gaps note covering AC-03.
