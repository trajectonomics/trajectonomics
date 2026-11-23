/**
 * Two expense Flows under a Spending rule that together state every key a rule takes, so each is
 * documented: `currentRate` takes steps and bounds, `guardrails` takes its two bands, and the core
 * refuses the other kind's keys. Both read Accounts the worked example declares.
 */
export const RULE_FLOWS: readonly Record<string, unknown>[] = [
	{
		id: "spending",
		kind: "expense",
		frequency: "monthly",
		start: "2026-01-01",
		rule: {
			kind: "currentRate",
			portfolio: ["cash", "index"],
			rateBps: 400,
			rounding: "floor",
			steps: [{ from: "2030-01-01", bps: 500 }],
			floor: { amount: 1_000, growth: "inflation" },
			ceiling: { amount: 90_000, growth: { bps: 0 } },
		},
	},
	{
		id: "guarded",
		kind: "expense",
		frequency: "annual",
		start: "2026-01-01",
		rule: {
			kind: "guardrails",
			portfolio: ["cash"],
			rateBps: 400,
			rounding: "halfUp",
			upper: { bps: 2000, adjustBps: 1000 },
			lower: { bps: 2000, adjustBps: 1000 },
		},
	},
]
