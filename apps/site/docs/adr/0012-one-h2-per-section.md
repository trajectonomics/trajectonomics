---
status: accepted
---

# Every section of the home has an `h2` inside `main`; `h3`–`h6` stay forbidden

## Status

Accepted. It amends [ADR 0006](./0006-page-headings.md), which allowed one `h2` and said "more headings need their own ADR".

## Context

The home was one claim and one section: the hero, then "Two parts, one command". The owner asked for three more sections below the hero, in the twenty.com manner: a side-by-side **See it in action**, a **How it works** that says which layer the agent owns and which layer traj owns, and a **Features** grid. Each is a section a visitor navigates by, so each needs a heading a screen reader can list. A second `h2` fails `HEADING_H2_NOT_ALLOWED` today.

## Decision

Every built page satisfies all of these:

- **One `h1`, inside `main`.** Unchanged.
- **Any number of `h2`, and each inside `main`.** One `h2` per section; an `h2` outside `main` fails `HEADING_H2_OUTSIDE_MAIN`.
- **No `h3`–`h6` anywhere.** Unchanged: `HEADING_TOO_DEEP`. A feature title, a layer name and a run label are plain text in the section, not headings, as the card titles were.

`HEADING_H2_NOT_ALLOWED` is retired, not widened: its meaning was "a second `h2`, or an `h2` outside `main`", so the one rule that survives takes a new code and the old code is removed (`CODING_STANDARDS.md`: an Error Code never changes meaning).

## Considered Options

- **Widen `HEADING_H2_NOT_ALLOWED`.** Rejected for the reason ADR 0006 gave: a code's meaning never changes.
- **Allow `h3` for the feature titles.** Rejected: a Features grid of six `h3` makes a heading outline of nine entries for a page that makes one claim. The titles read fine as bold text.
- **Keep one `h2` and build the new sections as unlabelled bands.** Rejected: three sections with no names are three regions a screen reader cannot tell apart.

## Consequences

- `src/lib/build/landmarks.ts` checks each `h2` is inside `main`; `failures.ts` swaps the retired code for the new one; `landmarks.test.ts` follows.
- The Hero's `h1` stays the page's one claim. Each section's `h2` is its Dictionary's own string, so Thai and English carry the same sections.
- Anything deeper than an `h2` still needs its own ADR.
