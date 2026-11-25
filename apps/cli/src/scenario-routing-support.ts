import { SCENARIO_DOCUMENT } from "./store/testing"

export type Doc = Record<string, unknown>

export const GROWN = { amount: 1_000_000, growth: "inflation" }

/** Two assets, so a step may take a share or a cap and another take what is left. */
export function withCashflow(cashflow: unknown): Doc {
	return {
		...SCENARIO_DOCUMENT,
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "funds", kind: "asset", rate: 0 },
			{ id: "loan", kind: "liability", rate: 0 },
		],
		cashflow,
	}
}

/** What a refusal is named by: the written key, the document it sits in, and the path it is refused at. */
export const CASES: readonly { name: string; cashflow: Doc; path: string; said: string }[] = [
	{
		name: "a surplus step with a share",
		cashflow: {
			surplus: [{ account: "cash", share: 3000 }, { account: "funds" }],
			contribute: [],
			withdraw: ["cash"],
		},
		path: "cashflow.surplus.0.share",
		said: '"share"',
	},
	{
		name: "a withdraw entry that is an object",
		cashflow: {
			surplus: [{ account: "cash" }],
			contribute: [],
			withdraw: [{ account: "cash", downTo: 3000 }, "funds"],
		},
		path: "cashflow.withdraw.0",
		said: "downTo",
	},
	{
		name: "an upTo that is an object",
		cashflow: {
			surplus: [{ account: "cash", upTo: GROWN }, { account: "funds" }],
			contribute: [],
			withdraw: ["cash"],
		},
		path: "cashflow.surplus.0.upTo",
		said: "growth",
	},
]
