/**
 * The fictional demo Scenario's Milestones: one fires on a date, one when net worth passes a figure, and one
 * whose date falls after the demo's horizon, so it is never reached. Amounts are integer minor units, as
 * the document holds them. Only one is a metric Milestone: each one makes every Market path of the
 * chance read evaluate it on every date, and the demo must stay quick enough for the contract test.
 */
export const DEMO_MILESTONES = [
	{
		id: "car-paid-off",
		displayLabel: "Car paid off",
		combine: "all",
		criteria: [{ id: "date", kind: "date", on: "2031-01-01" }],
	},
	{
		id: "net-worth-ten-million",
		displayLabel: "10M net worth",
		combine: "all",
		criteria: [
			{
				id: "net-worth",
				kind: "metric",
				metric: "netWorth",
				op: "atLeast",
				amount: 1_000_000_000,
				terms: "nominal",
			},
		],
	},
	{
		id: "sabbatical",
		displayLabel: "Sabbatical",
		combine: "all",
		criteria: [{ id: "date", kind: "date", on: "2070-01-01" }],
	},
]
