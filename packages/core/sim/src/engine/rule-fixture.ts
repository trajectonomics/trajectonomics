/** TEST-ONLY: a portfolio `inv` that no Flow touches, and a `cash` Account the rule's expense draws on. */
import type { Fixture } from "../fixtures/fixture"
import type {
	Calendar,
	DateString,
	Projection,
	SpendingRule,
	SpendingRuleStatement,
} from "../types"
import { project } from "./project"
import { makeFixture } from "./test-helpers"
import { ruledExpense } from "./test-rules"

export interface RuleSetup {
	readonly rule: SpendingRule
	/** The portfolio's yearly rate and opening value. */
	readonly rate?: number
	readonly opening?: number
	readonly inflation?: number
	readonly frequency?: "monthly" | "annual"
	readonly horizon?: string
	readonly cash?: number
	/** The Flow's `start` (default the Timeline start) and the Scenario's Calendar. */
	readonly start?: DateString
	readonly calendar?: Calendar
}

export function ruleFixture(setup: RuleSetup): Fixture {
	return makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "inv", kind: "asset", rate: setup.rate ?? 0 },
		],
		balances: { cash: setup.cash ?? 10_000_000_000, inv: setup.opening ?? 100_000_000 },
		flows: [
			ruledExpense("spend", setup.rule, {
				frequency: setup.frequency ?? "monthly",
				...(setup.start === undefined ? {} : { start: setup.start }),
			}),
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		inflation: setup.inflation ?? 0,
		...(setup.calendar === undefined ? {} : { calendar: setup.calendar }),
		start: "2026-01-01",
		horizon: setup.horizon ?? "2028-12-31",
		resolution: "month",
	})
}

/** The Projection with its Spending rule statements. */
export function ruled(fixture: Fixture): Projection {
	const { baseline, scenario, timeline } = fixture
	const result = project(baseline, scenario, timeline, { spendingRules: true })
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

/** The one statement of a Scenario with a single rule Flow. */
export function statement(setup: RuleSetup): SpendingRuleStatement {
	return ruled(ruleFixture(setup)).spendingRules![0]!
}
