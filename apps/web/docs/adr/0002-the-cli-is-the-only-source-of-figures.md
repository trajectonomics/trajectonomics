---
status: accepted
---

# The CLI is the only source of figures

Every number on the Dashboard is one `traj` returned. The Dashboard never imports a core package to compute a figure, never adds, subtracts or rounds money, and shows the CLI's decimal strings as they are.

A string is parsed to a number in one place only: to place a mark on a chart, where a rounding error cannot reach a figure a person reads. Deltas between two Scenarios come from `traj projection compare`, not from a subtraction in the page.

Money types stay strings in the contract. A Scenario document holds integer minor units and integer rates, but the Dashboard does not read or write Scenario documents; it reads the CLI's results only.

## Considered Options

- **Compute the deltas and the totals in the page.** Rejected. The point of `traj` is that its arithmetic is the one answer. A second implementation in the page would drift from it without any test noticing.
- **Import `@trajectonomics/core` for the chart's scale.** Rejected for the same reason. The chart only needs numbers that are already printed.

## Consequences

- A figure the CLI does not print is missing from the Dashboard, not estimated.
- A reviewer checks a page by finding the Read it shows, not by re-doing a sum.
