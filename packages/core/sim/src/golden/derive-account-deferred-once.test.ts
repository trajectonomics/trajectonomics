import { describe, expect, it } from "bun:test"
import { derivedIncome, expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { check, financialIndependence } from "../index"
import type { Derive, Flow, Milestone, ReturnModel } from "../types"

/** (inv - floor) / 1,000: prices the value of `inv` on the date it lands. */
function over(floor: number): Derive {
	return {
		measures: [
			{ id: "value", op: "account", account: "inv" },
			{ id: "floor", op: "const", value: floor },
			{ id: "excess", op: "sub", a: "value", b: "floor" },
			{ id: "share", op: "scale", of: "excess", num: 1, den: 1000, rounding: "halfUp" },
		],
		result: "share",
	}
}
const monthly = { frequency: "monthly", start: "2026-01-01" } as const
/** Fires on 2028-06-01 at the earliest; the netWorth criterion makes the Milestone dynamic. */
const gate: Milestone = {
	id: "gate",
	combine: "all",
	criteria: [
		{ id: "d", kind: "date", on: "2028-06-01" },
		{ id: "m", kind: "metric", metric: "netWorth", op: "atLeast", amount: 1, terms: "nominal" },
	],
}
/** A bonus that starts 2026-01-10 but waits for the gate, so it lands on the gate's fire date. */
const deferred = { frequency: "once", start: "2026-01-10", startAt: "gate" } as const
const reference = { multiplier: 25, basis: "netWorth", window: "next12Months", terms: "nominal" }
const trailing = { ...reference, window: "trailing12Months" }
const model: ReturnModel = {
	id: "m",
	accounts: ["inv"],
	buckets: [
		{ returnsBps: [-1000], weight: 2147483648 },
		{ returnsBps: [1500], weight: 2147483648 },
	],
}

function plan(inv: number, extra: readonly Flow[]) {
	const fixture = makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "inv", kind: "asset", rate: 500 },
		],
		balances: { cash: 600_000, inv },
		flows: [income("salary", 500_000, monthly), expense("living", 150_000, monthly), ...extra],
		surplus: [{ account: "inv" }],
		withdraw: ["cash", "inv"],
		start: "2026-01-01",
		horizon: "2031-01-01",
		resolution: "month",
	})
	return { ...fixture, scenario: { ...fixture.scenario, milestones: [gate] } }
}

function found(inv: number, extra: readonly Flow[], options: object, returns?: ReturnModel) {
	const { baseline, scenario, timeline } = plan(inv, extra)
	const result = financialIndependence(baseline, scenario, timeline, options as never, returns)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	const fi = result.financialIndependence
	if (!fi.reachable) throw new Error("FI not reachable")
	return { month: fi.month, annualExpenses: fi.reference?.annualExpenses }
}

/** The bonus every candidate stops, as a fixed amount: it cannot move an FI figure. */
const fixed = income("bonus", 59_000, deferred)
const priced = derivedIncome("bonus", over(1_000_000), deferred)

describe("a deferred once Derived income that every candidate stops, read on its Milestone's fire date", () => {
	it("is accepted by check()", () => {
		const { baseline, scenario, timeline } = plan(2_000_000, [priced])
		expect(check(baseline, scenario, timeline)).toEqual([])
	})

	const cases = [
		{ inv: 2_000_000, buffer: 0, month: "2027-01-01" },
		{ inv: 2_000_000, buffer: 3, month: "2027-02-01" },
		{ inv: 500_000, buffer: 0, month: "2027-04-01" },
		{ inv: 500_000, buffer: 3, month: "2027-05-01" },
	]
	for (const { inv, buffer, month } of cases) {
		it(`inv ${inv}, buffer ${buffer}: FI ${month}, 1,800,000 (living 150,000 x 12)`, () => {
			const options = { method: "survival", minBufferMonths: buffer, reference }
			const got = found(inv, [priced], options)
			expect({ month: got.month, annualExpenses: BigInt(got.annualExpenses!) }).toEqual({
				month,
				annualExpenses: 1_800_000n,
			})
		})
	}

	it("a retirement spending with a trailing reference answers as the fixed bonus does", () => {
		const options = {
			method: "survival",
			minBufferMonths: 3,
			retirementSpending: { amount: 150_000, growth: { bps: 0 } },
			reference: trailing,
		}
		expect(found(2_000_000, [priced], options)).toEqual(found(2_000_000, [fixed], options))
	})

	it("an annual Derived income between the candidate's month and the fire date is not read stale", () => {
		const annual = derivedIncome("annual", over(0), { frequency: "annual", start: "2026-03-10" })
		const options = { method: "survival", minBufferMonths: 3, reference }
		expect(found(2_000_000, [priced, annual], options)).toEqual(
			found(2_000_000, [fixed, annual], options),
		)
	})

	it("the probability method answers as the fixed bonus does", () => {
		const options = {
			method: "probabilityThreshold",
			thresholdBps: 5000,
			paths: 4,
			seed: "0000000000000000",
		}
		expect(found(2_000_000, [priced], options, model)).toEqual(
			found(2_000_000, [fixed], options, model),
		)
	})
})
