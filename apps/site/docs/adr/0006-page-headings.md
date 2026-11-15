---
status: accepted
---

# Every page keeps one `h1` inside `main`; one `h2` is allowed inside `main`; `h3`–`h6` are forbidden

## Status

Accepted

## Context

[ADR 0004 (landing page redesign)](./0004-landing-page-redesign.md) kept the landmarks rule "one `h1` and no other headings", so the hero makes the page's one claim. The v0.1.0 launch revision (site#24) adds one section below the hero whose heading is an `h2` ("Two parts, one command"), so the rule must allow exactly one `h2` inside `main`. The rule runs in the framework of [ADR 0004 (build-output checks)](./0004-build-output-checks.md): a Pure Core in `src/lib/build/` that returns failures, one Error Code per rule, and no Error Code ever changes meaning (`GLOSSARY.md`, `CODING_STANDARDS.md`).

## Decision

Every built page satisfies all of these:

- **One `h1`, inside `main`.** Unchanged: a missing or extra `h1` still fails `HERO_MISSING` / `PAGE_H1_COUNT`.
- **At most one `h2`, and only inside `main`.** A forbidden `h2` — outside `main`, or a second `h2` — fails under a new Error Code.
- **No `h3`–`h6` anywhere.** Each deeper heading fails under another new Error Code.

`EXTRA_HEADING` is retired, not widened: its meaning does not change, it is removed and replaced by the two new codes, so one rule keeps one code and no two rules share a code.

This supersedes the "no new sections" part of [ADR 0004 (landing page redesign)](./0004-landing-page-redesign.md).

## Considered Options

- **Widen `EXTRA_HEADING` to allow one `h2` inside `main`.** Rejected: `GLOSSARY.md` and `CODING_STANDARDS.md` say an Error Code's meaning never changes and two rules never share one code, so the old code is retired and the new rules get new codes.
- **Allow any number of `h2` elements.** Rejected: the page's structure stays one claim plus one section; more headings need their own ADR.
- **Keep forbidding every heading after the `h1`.** Rejected: the v0.1.0 launch needs the two-part section's `h2` (site#24, decision 10).

## Consequences

- `src/lib/build/landmarks.ts` is rewritten with the new rules and tests; `failures.ts` retires `EXTRA_HEADING` and adds the two new codes. That code change is part of site#25, not of this record.
- The two-part section renders its `h2` inside `main` and passes; the card titles ("Skills", "traj CLI") are plain text, not headings.
- A second `h1` still fails `HERO_MISSING` / `PAGE_H1_COUNT`, unchanged.
- The Not-found pages are pages like any other and satisfy the same rule.
