/**
 * The retirement spending of the worked example (cli ADR-0063): one expense Flow whose yearly amount
 * follows what the savings are worth, from the example's own `retire` Milestone on. The salary, the
 * rent and the monthly investment end at the same Milestone, so the rule is what pays for life from
 * then, out of `cash`.
 *
 * Every figure is a stated example value, never a default: `traj` ships no rate, band, rounding or
 * portfolio for a Spending rule, and a person writing their own states theirs. Here the rule starts at
 * 4% of what `cash` and `index` are worth, then each year is last year's amount grown by inflation, cut
 * by 10% when the share has grown past 20% above 4%, and raised by 10% when it has fallen 20% below.
 */
export const RETIREMENT_FLOWS: readonly Record<string, unknown>[] = [
	{
		id: "retirement-spending",
		kind: "expense",
		category: "retirement",
		frequency: "monthly",
		start: "2026-01-01",
		startAt: "retire",
		rule: {
			kind: "guardrails",
			portfolio: ["cash", "index"],
			rateBps: 400,
			rounding: "floor",
			upper: { bps: 2000, adjustBps: 1000 },
			lower: { bps: 2000, adjustBps: 1000 },
		},
	},
]
