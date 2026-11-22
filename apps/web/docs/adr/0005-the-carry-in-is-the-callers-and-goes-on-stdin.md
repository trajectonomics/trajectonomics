---
status: accepted
---

# The Carry-in is the caller's, and each read takes its own on standard input

A Projection that starts inside a Levy's tax period refuses to run without a Carry-in record for that period: the CLI derives nothing, so the caller states what the period had already tallied before the As-of ([cli ADR 0032](../../../cli/docs/adr/0032-tax-is-the-scenarios-levy.md)). The Dashboard's own as-of is a date the person chooses, so a Snapshot cannot assume it is at the start of a period.

The runner takes one `--carry-in PATH`, a JSON array with a record for every Scenario and period the Snapshot needs. The CLI refuses a record for a Scenario a command does not prepare, so each read gets only the records of the Scenarios it names, and the runner passes them on standard input with `--carry-in -`. The argv a Read keeps therefore reads `--carry-in -`. The result of each projection echoes the records it used, so the Snapshot still shows the figures that were stated.

## Considered Options

- **Write one temporary file per Scenario and pass its path.** Rejected. A path in the argv would name a scratch file that the Snapshot cannot reproduce, and the scratch files need cleaning up on every failure.
- **Pass the whole array, and let the CLI pick.** Rejected. The CLI refuses a record for a Scenario the command does not prepare, so a compare of two Scenarios would fail on a third one's record.
- **Derive the tallies from the ledger in the Dashboard.** Rejected by [ADR 0002](0002-the-cli-is-the-only-source-of-figures.md). The tallies are arithmetic on money.

## Consequences

- A Snapshot made with a Carry-in is not reproducible from its argv alone: the person keeps the file that held the records.
- A read that needs a record the file does not hold fails with the CLI's own message, which names the period and the Levy.
