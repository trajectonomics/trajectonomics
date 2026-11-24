import type { Scenario } from "@trajectonomics/core/sim"

/** Satang in one baht (cli ADR-0070): a figure in the plan is its baht times this. */
export const THB = 100

/** The Flows of the routing plan (projection-routing-plan.ts): income, spending, a borrowing and two transfers. */
export const ROUTING_FLOWS: Scenario["flows"] = [
	{
		id: "salary",
		kind: "income",
		earned: true,
		amount: 100_000 * THB,
		frequency: "monthly",
		start: "2026-01-01",
		growth: { bps: 0 },
	},
	{
		id: "rent",
		kind: "expense",
		amount: 30_000 * THB,
		frequency: "monthly",
		start: "2026-01-01",
		growth: { bps: 0 },
	},
	{
		id: "repair",
		kind: "expense",
		amount: 400_000 * THB,
		frequency: "once",
		start: "2026-10-01",
		growth: { bps: 0 },
	},
	{
		id: "pvd-in",
		kind: "contribution",
		target: "pvd",
		amount: 5_000 * THB,
		frequency: "monthly",
		start: "2026-01-01",
		growth: { bps: 0 },
	},
	{
		id: "borrow",
		kind: "withdrawal",
		source: "debt",
		amount: 3_000 * THB,
		frequency: "once",
		start: "2026-01-01",
		growth: { bps: 0 },
	},
	{
		id: "roll-pvd",
		kind: "transfer",
		source: "pvd",
		target: "rmf",
		frequency: "once",
		start: "2026-07-01",
		derive: {
			measures: [{ id: "all", op: "account", account: "pvd" }],
			result: "all",
		},
	},
	{
		id: "pay-debt",
		kind: "transfer",
		source: "funds",
		target: "debt",
		frequency: "monthly",
		start: "2026-04-01",
		amount: 1_000 * THB,
		growth: { bps: 0 },
	},
]
