# Make the eval-coverage allowlist one-way, or a warning instead of a failure

Every skill declares `acceptance.criteria`. A skill whose criteria are not yet runnable must say `acceptance.pending: <reason>` **and** be named in `src/eval-coverage.json`. The gate then fails in both directions: an unlisted pending skill fails the build, and so does a listed skill that has since gained real `acceptance.cases`. Requests to drop the second direction, or to downgrade the whole gate to a warning, are out of scope.

## Why this is out of scope

The second direction is the entire mechanism. An allowlist that only catches *new* omissions is a list nobody ever removes from — entries accumulate, and "pending a fixture" becomes the permanent state of a skill that quietly has no eval. Failing when a skill outgrows its entry means writing the fixture forces you to delete the line, which is the only thing that keeps the list honest.

Downgrading to a warning has the same effect by a different route: CI warnings are not read.

The cost is one line of JSON per uncovered skill, and the reason string next to it is useful documentation in its own right — it names what fixture the skill is waiting on. See `enforceCoverage()` in `scripts/build-skills.js`.

## What to do instead

Give the skill an `acceptance.cases` entry pointing at a fixture, and delete its allowlist line. If the fixture is genuinely out of reach right now, add the entry with a reason specific enough that the next person knows what to build — `"no fixture yet — needs a recorded session transcript to compact"`, not `"TODO"`.
