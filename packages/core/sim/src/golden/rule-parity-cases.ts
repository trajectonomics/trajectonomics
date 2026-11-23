import type { ParityCase } from "./parity-cases"
import { drawdown, RULE_MARKET, savingPlan } from "./rule-cases"
import { swing } from "./rule-swing"

const base = { portfolio: ["inv"], rateBps: 400, rounding: "halfUp" } as const
const band = { bps: 1500, adjustBps: 800 }
const withRules = { spendingRules: true } as const

/**
 * Spending rules (ADR 0023), pinned under every engine: each kind's Projection with its statement (the
 * guardrails one on a portfolio that moves enough to cut and to raise), a chance of success over a two-bucket market, and Financial Independence with a rule Flow.
 */
export const RULE_PARITY_CASES: readonly ParityCase[] = [
	{
		name: "rule-initial-rate",
		fixture: drawdown({ kind: "initialRate", ...base }),
		projectOptions: withRules,
	},
	{
		name: "rule-current-rate-bounds",
		fixture: drawdown({
			kind: "currentRate",
			...base,
			steps: [{ from: "2027-01-01", bps: 500 }],
			floor: { amount: 380_000, growth: "inflation" },
			ceiling: { amount: 520_000, growth: { bps: 200 } },
		}),
		projectOptions: withRules,
		chance: { model: RULE_MARKET, seed: "0123456789abcdef", paths: 4 },
	},
	{
		name: "rule-guardrails",
		fixture: swing({ kind: "guardrails", ...base, upper: band, lower: band }),
		projectOptions: withRules,
	},
	{
		name: "rule-guardrails-chance",
		fixture: drawdown({ kind: "guardrails", ...base, upper: band, lower: band }),
		chance: { model: RULE_MARKET, seed: "0123456789abcdef", paths: 6 },
	},
	{
		name: "rule-fi",
		fixture: savingPlan({ kind: "currentRate", ...base }),
		options: { method: "survival", minBufferMonths: 12 },
	},
]
