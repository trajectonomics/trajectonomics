# ADR 0006: A tax comparison uses Levies written in the conversation

**Status**: Accepted

## Context

A Scenario stores its tax Levy, and the Levy carries the rules of the `traj` release that wrote it. The
`cli-v0.5.0` notes say a Levy written before 0.5.0 keeps the old rules (whole-baht floors, the GPF cap)
until `traj scenario tax <name> --tax th-2026` writes it again, in place. `traj-plan`'s Step T4 compared
the baseline's `owed` with a what-if fork's, and only the fork's Levy was rewritten, so a baseline kept
from an earlier session put two rule sets in one difference, reported as "what the deduction changes"
(#173). Neither `traj schema` nor the stored document says which release wrote a Levy, so the Skill
cannot detect it.

## Decision

1. Step T2's fork is the **Tax Baseline**: its Levy is written by the installed `traj`, with the facts
   the person states in Step T1. Step T4 compares that fork with a what-if forked from it, whose Levy is
   written again with the one change. The two sides then differ in one flag and share one rule set.
2. A person who arrives with a Scenario that already holds a Levy gets Step T2 on a fork of it. The stored
   Levy is never a side of a comparison, and the Skill never rewrites it.
3. The `--set` route for a retirement or ThaiESG contribution compares the tax baseline with itself, so
   it follows the same rule.

## Considered Options

- **Rewrite the person's baseline Levy in place before comparing.** Rejected: it edits a stored plan the
  person did not ask to change, and replaces its Levy and Prepayments with the facts of one conversation.
- **Detect an old Levy and say so.** Rejected: no published field names the release that wrote a Levy, so
  a Skill rule would be a guess. A `traj` field that reports it would be a CLI change; this decision does
  not wait on one, and the fork route stays correct if it arrives.

## Consequences

- The comparison needs no detection and no consent, because it writes only forks the Skill made.
- Every tax comparison costs one extra `scenario tax` on the baseline fork when the person's plan already
  carried a Levy; Step T2 already does that write for a fresh plan.
