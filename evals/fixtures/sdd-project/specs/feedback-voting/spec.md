# Spec — Feedback voting

## 1. Vision

Users of the feedback board can vote for the items they care about, so the
team sees demand instead of guessing it.

## 3. Features

- **AC-01 — Vote toggle**: A user can upvote a feedback item. Voting a second
  time on the same item removes their vote (toggle). A user never holds more
  than one vote on one item.
- **AC-02 — Distinct count**: The vote count shown for an item always equals
  the number of distinct users currently voting for it.
- **AC-03 — No self-votes**: A user cannot vote on their own feedback item.
  The attempt is rejected with an error and no vote is recorded.

## 4. Flows

- Happy path: open item → vote → count rises by one → vote again → count
  drops by one.
- Error path: author opens their own item → vote → error shown, count
  unchanged.

## 6. Non-functional requirements

- Vote state changes are persisted before the response returns.
