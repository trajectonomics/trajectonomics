/**
 * The fictional demo Scenario's Milestones: one fires on a date, one when net worth passes a figure, and one
 * that no plan of this size reaches. Amounts are integer minor units, as the document holds them.
 */
export const DEMO_MILESTONES = [
	{
		id: "car-paid-off",
		combine: "all",
		criteria: [{ id: "date", kind: "date", on: "2031-01-01" }],
	},
	{
		id: "net-worth-ten-million",
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
		id: "net-worth-ten-trillion",
		combine: "all",
		criteria: [
			{
				id: "net-worth",
				kind: "metric",
				metric: "netWorth",
				op: "atLeast",
				amount: 1_000_000_000_000_000,
				terms: "nominal",
			},
		],
	},
]
