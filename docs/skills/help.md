# /ak:help

## What it does

Takes a description of what you're trying to do and names the one skill that fits it, with the exact command to type. With no task, it prints the whole set and stops.

It commits to a single answer. A shortlist hands the decision back to the person who asked precisely because they didn't want to make it — and the ability to say "none of these fits, that's a design question" is what keeps the single answer trustworthy. A router that always finds a match is a router that sends people to the wrong place.

## When to reach for it

You invoke this by typing `/ak:help <what you're trying to do>` — the agent won't reach for it on its own.

Reach for it when you know the kit has something for this and can't remember which. Most of the set is user-invoked: the agent will never fire those for you, so *you* are the index that has to remember they exist. This skill is that index, externalised.

## The catalogue is generated

The table of skills in this page's counterpart isn't maintained by hand — `scripts/build-skills.js` injects it from the specs at build time. A router that goes stale is worse than no router, because it answers confidently with the wrong set.

The table also marks each skill's **invocation**: `model` skills can fire on their own when a task obviously fits; `user` skills only ever run because someone typed them. That column is the reason the router exists.

## It's working if

- You get one command, filled in with your own words as its arguments — not a menu.
- The reason it gives is about your task, not a paraphrase of the skill's blurb.
- It occasionally tells you nothing fits.
- It never starts doing the work. Routing is the whole job.
- A skill added last week shows up without anyone editing this skill.

## Where it fits

The map over the whole set — reach for it any time, and especially early on. Where a second skill is the obvious *next* step it names that too, as a chain rather than an alternative: [`/ak:plan`](plan.md) → [`/ak:commit`](commit.md) → [`/ak:review`](review.md) → [`/ak:pr`](pr.md).

The other run-once orientation skill is [`/ak:setup`](setup.md): this one tells you which skill to use, that one tells the skills how this repo works.
