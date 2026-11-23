import { contribution, expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { ruledExpense } from "../engine/test-rules"
import type { Fixture } from "../fixtures/fixture"
import type { Flow, Milestone, ReturnModel, SpendingRule } from "../types"

const monthly = { frequency: "monthly", start: "2026-01-01" } as const

/** Opens on 2026-04-01, whatever the walk: the spending rule starts there. */
const retire: Milestone = {
	id: "retire",
	combine: "all",
	criteria: [
		{ id: "when", kind: "date", on: "2026-04-01" },
		{ id: "worth", kind: "metric", metric: "netWorth", op: "atLeast", amount: 0, terms: "nominal" },
	],
}

/** A saver whose investments fund a rule Flow from 2026-04-01, beside a living cost of 150,000 a month. */
export function savingPlan(
	rule: SpendingRule | undefined,
	opening = 3_000_000,
	rate = 500,
): Fixture {
	const flows: Flow[] = [
		income("salary", 800_000, monthly),
		expense("living", 150_000, monthly),
		contribution("save", "inv", 500_000, monthly),
		...(rule === undefined
			? []
			: [ruledExpense("spending", rule, { ...monthly, startAt: "retire" })]),
	]
	const built = makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "inv", kind: "asset", rate },
		],
		balances: { cash: 2_000_000, inv: opening },
		flows,
		surplus: [{ account: "cash" }],
		contribute: ["inv"],
		withdraw: ["cash", "inv"],
		start: "2026-01-01",
		horizon: "2036-01-01",
		resolution: "month",
	})
	return { ...built, scenario: { ...built.scenario, milestones: [retire] } }
}

/** A flat month and a -15% month, equally weighted, over the investments. */
const HALF = 2147483648
export const RULE_MARKET: ReturnModel = {
	id: "rule-market",
	accounts: ["inv"],
	buckets: [
		{ returnsBps: [0], weight: HALF },
		{ returnsBps: [-1500], weight: HALF },
	],
}

/** Four years from 10,000,000 with no income: the rule's own draw is what moves the portfolio. */
export function drawdown(rule: SpendingRule): Fixture {
	return makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "inv", kind: "asset", rate: 400 },
		],
		balances: { cash: 1_000_000, inv: 10_000_000 },
		flows: [ruledExpense("spending", rule, monthly)],
		surplus: [{ account: "inv" }],
		withdraw: ["cash", "inv"],
		inflation: 250,
		start: "2026-01-01",
		horizon: "2030-01-01",
		resolution: "month",
	})
}
