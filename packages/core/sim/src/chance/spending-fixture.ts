/** TEST-ONLY: a cash plan whose rule Flow and rent draw on the one Account the rule reads. */
import { expense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { ruledExpense } from "../engine/test-rules"
import type { Fixture } from "../fixtures/fixture"
import type { ReturnModel, SpendingRule } from "../types"

/** Bucket weights total 2^32: 7/8 flat, 1/8 a crash that leaves one ten-thousandth of the balance. */
export const FLAT_OR_CRASH: ReturnModel = {
	id: "flat-or-crash",
	accounts: ["cash"],
	buckets: [
		{ returnsBps: [0], weight: 3758096384 },
		{ returnsBps: [-9999], weight: 536870912 },
	],
}

export const FLAT: ReturnModel = {
	id: "flat",
	accounts: ["cash"],
	buckets: [{ returnsBps: [0], weight: 4294967296 }],
}

export const TEN_PERCENT: SpendingRule = {
	kind: "initialRate",
	portfolio: ["cash"],
	rateBps: 1000,
	rounding: "halfUp",
}

/** 1,200,000 in cash; the rule and 10,000 of rent a month; the rule starts on `start`. */
export function cashPlan(
	horizon: string,
	rule: SpendingRule = TEN_PERCENT,
	start?: string,
): Fixture {
	return makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 1_200_000 },
		flows: [
			ruledExpense("spend", rule, start === undefined ? {} : { start }),
			expense("rent", 10_000, { frequency: "monthly" }),
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		horizon,
		resolution: "month",
	})
}
