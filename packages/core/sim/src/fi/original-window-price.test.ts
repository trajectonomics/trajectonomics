import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { derivedExpense, expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { financialIndependence } from "../index"
import type { DateString, Derive } from "../types"

/** An upkeep of inv / 1,000 each month, priced from the Account's value on the date it lands. */
const upkeep: Derive = {
	measures: [
		{ id: "value", op: "account", account: "inv" },
		{ id: "share", op: "scale", of: "value", num: 1, den: 1000, rounding: "halfUp" },
	],
	result: "share",
}
const monthly = { frequency: "monthly", start: "2026-01-01" } as const
const reference = { multiplier: 25, basis: "netWorth", window: "next12Months", terms: "nominal" }

function setup(inv: number, horizon: DateString, salaryEnd?: DateString) {
	return makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "inv", kind: "asset", rate: 0 },
		],
		balances: { cash: 0, inv },
		flows: [
			income("salary", 500_000, { ...monthly, earned: true, ...(salaryEnd && { end: salaryEnd }) }),
			expense("living", 150_000, monthly),
			derivedExpense("upkeep", upkeep, monthly),
		],
		surplus: [{ account: "inv" }],
		withdraw: ["cash", "inv"],
		start: "2026-01-01",
		horizon,
		resolution: "month",
	})
}

/** The date `months` first-of-months after `date` (all dates here fall in 2026 or 2027). */
function shift(date: DateString, months: number): DateString {
	const index = Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 + months
	const month = String((index % 12) + 1).padStart(2, "0")
	return `${Math.floor(index / 12)}-${month}-01` as DateString
}

/**
 * The expense the Projection of `salaryEnd`'s plan lands on dates after `from` and up to `to`, the
 * roll-ups' difference: a Projection's horizon is a date it still lands on.
 */
function expensesBetween(inv: number, salaryEnd: DateString, from: DateString, to: DateString) {
	const total = (horizon: DateString): bigint => {
		const { baseline, scenario, timeline } = setup(inv, horizon, salaryEnd)
		const result = project(baseline, scenario, timeline)
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		return result.projection.annual.reduce((sum, year) => sum + BigInt(year.expense), 0n)
	}
	return total(to) - total(from)
}

describe("the FI window prices a Derived upkeep from the candidate's own walk, to the unit", () => {
	// inv takes the surplus, so it grows by 500,000 - 150,000 - upkeep a month before FI.
	// Hand check of the tail case, inv 700,000 on 2026-01-01 (rate 0, the salary adds 500,000 - 150,000):
	// January's upkeep is 700 and inv closes at 700,000 + 350,000 - 700 = 1,049,300; February's upkeep
	// is 1,049 (1,049.3) and inv closes at 1,398,251; March's is 1,398 and inv closes at 1,746,853. FI
	// is 2026-04-01 and the salary stops there, so April's upkeep reads 1,746,853 / 1,000 = 1,746.853,
	// which is 1,747: 151,747 with the living, and inv falls to 1,595,106 for May's 1,595, and so on.
	// The window runs to March 2027, past the horizon of 2027-01-01, so its last months price the tail.
	const cases = [
		{
			name: "FI inside the horizon",
			inv: 6_000_000,
			horizon: "2031-01-01",
			fi: "2026-08-01",
			annual: 1_890_389n,
		},
		{
			name: "FI within 12 months of the horizon (the tail)",
			inv: 700_000,
			horizon: "2027-01-01",
			fi: "2026-04-01",
			annual: 1_810_982n,
		},
	] as const
	for (const { name, inv, horizon, fi, annual } of cases) {
		it(`${name}: FI ${fi}, annualExpenses ${annual} equal the Projection's next 12 months`, () => {
			const { baseline, scenario, timeline } = setup(inv, horizon)
			const result = financialIndependence(baseline, scenario, timeline, {
				method: "survival",
				minBufferMonths: 0,
				reference,
			} as never)
			if (!result.ok || !result.financialIndependence.reachable) throw new Error("FI not reached")
			const { month, reference: found } = result.financialIndependence
			expect(month).toBe(fi)
			// The salary's last Occurrence is the month before FI; the window is [FI, FI + 12 months).
			const [stopped, through] = [shift(fi, -1), shift(fi, 11)]
			expect(BigInt(found!.annualExpenses)).toBe(annual)
			expect(BigInt(found!.annualExpenses)).toBe(expensesBetween(inv, stopped, stopped, through))
		})
	}
})
