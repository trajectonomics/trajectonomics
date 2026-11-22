# `fi` prints the tax of the path its answer describes

`fi` reported the right FI date but printed `taxYears` from a second run, a Projection of the unmodified Scenario in which earned income never stops. ADR-0036 chose that run because the FI answer carried no Projection. After the FI date the rows kept charging salary-level tax, and a reader took them for the tax the survival scan had charged, while the scan had charged only what remains after earned income stops. A validation run read `฿544,902` for a year after the date and concluded the date was wrong (#255).

## Decision

- The survival answer carries the Levy results of the path it describes (sim ADR 0015). `fi` prints those rows when the answer is reachable: earned income as the Scenario states it before the FI date, stopped from the FI date on, built by the same events the scan walked. The CLI holds no stop rule and runs no second Projection for the rows.
- When FI is unreachable there is no stopped path to describe, so `fi` keeps today's rows, from the Projection of the Scenario as written, and adds one note: `FI is not reachable, so taxYears describes the plan as written, with earned income running to the horizon.`
- `traj schema fi` says which path the rows describe, in the description of `taxYears`. No new field is added: the note carries the unreachable case and the description carries the rule.
- `fi` still projects the Scenario once for its funding and withdrawal notes, which describe the plan as written. No FI date changes.
- ADR-0036's statement that `fi` runs one Projection over the inputs the survival scan used is superseded for the rows by this decision.

## Considered options

- **End every earned Flow the day before the FI date and project that.** Rejected: it restates the scan's stop rule in the CLI and differs from it where a Flow lands across the month boundary on a Business day, where a deferred `once` Flow lands later, and where a Milestone gates a Flow.
- **A `taxPath` field naming `stopped` or `working`.** Rejected: the field would be constant on every reachable answer, and the unreachable case needs a sentence to read anyway.

## Consequences

- `projection compare` keeps its per-side `taxYears` from the Projection of each side as written, because a compare states both sides' FI answers beside a full Projection and does not claim the rows follow the FI date.
- An existing `fi` golden for a taxed Scenario changes only in the rows after its FI date. A Scenario with no Levy is unchanged.
