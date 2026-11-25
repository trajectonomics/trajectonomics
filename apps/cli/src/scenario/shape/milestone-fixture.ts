/** The milestones the structure probe carries: every criterion kind and every Metric form (sim ADR 0012). */
export const FULL_MILESTONES: unknown[] = [
	{
		id: "retire",
		displayLabel: "Retirement",
		combine: "any",
		criteria: [
			{ id: "when", kind: "date", on: "2045-01-01" },
			{
				id: "wealth",
				kind: "metric",
				metric: "accessibleNetWorth",
				op: "atLeast",
				amount: 50_000_000,
				terms: "real",
			},
		],
	},
	{
		id: "downsize",
		combine: "all",
		criteria: [
			{ id: "after", kind: "milestone", milestone: "retire", months: 24 },
			{
				id: "covers",
				kind: "multiple",
				metric: "netWorth",
				op: "atLeast",
				base: { expenses: "trailing12Months" },
				num: 25,
				den: 1,
				terms: "nominal",
			},
			{
				id: "held",
				kind: "metric",
				metric: { accounts: ["cash"] },
				op: "atMost",
				amount: 500,
				terms: "nominal",
			},
		],
	},
]
