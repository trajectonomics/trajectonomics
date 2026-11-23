import { describe, expect, it } from "bun:test"
import { derivedExpense, expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { thaiEmployee } from "../fixtures/thai-employee"
import { financialIndependence } from "../index"
import type { Derive, ReturnModel } from "../types"

const upkeep: Derive = {
	measures: [
		{ id: "value", op: "account", account: "inv" },
		{ id: "share", op: "scale", of: "value", num: 1, den: 300, rounding: "halfUp" },
	],
	result: "share",
}
const monthly = { frequency: "monthly", start: "2026-01-01" } as const

describe("an FI scan over a plan with an Account-reading expense", () => {
	it("walks past the horizon through a Levy plan and still answers: 1 Jan 2041, as without the read", () => {
		// 1/5000 of the emergency fund a month is a small cost beside this plan's spending, so the
		// month does not move; the walk's year past the horizon runs on copies of the Levy tallies.
		const fund = thaiEmployee.scenario.accounts.find((account) => account.kind === "asset")!.id
		const read: Derive = {
			...upkeep,
			measures: [
				{ id: "value", op: "account", account: fund },
				{ id: "share", op: "scale", of: "value", num: 1, den: 5000, rounding: "halfUp" },
			],
		}
		const flows = [...thaiEmployee.scenario.flows, derivedExpense("upkeep", read, monthly)]
		const { baseline, timeline } = thaiEmployee
		const scenario = { ...thaiEmployee.scenario, flows }
		const result = financialIndependence(baseline, scenario, timeline, {
			method: "survival",
			minBufferMonths: 6,
		})
		expect(result.ok && result.financialIndependence.reachable).toBe(true)
		if (result.ok && result.financialIndependence.reachable) {
			expect(result.financialIndependence.month).toBe("2041-01-01")
		}
	})

	it("reads each Market path's own Account values: flat returns give the survival month", () => {
		const fixture = makeFixture({
			accounts: [
				{ id: "cash", kind: "asset", rate: 0 },
				{ id: "inv", kind: "asset", rate: 0 },
			],
			balances: { cash: 1_000_000, inv: 30_000_000 },
			flows: [
				income("salary", 800_000, monthly),
				expense("living", 150_000, monthly),
				derivedExpense("run", upkeep, monthly),
			],
			surplus: [{ account: "cash" }],
			withdraw: ["cash", "inv"],
			start: "2026-01-01",
			horizon: "2031-01-01",
			resolution: "month",
		})
		const flat: ReturnModel = {
			id: "flat",
			accounts: ["cash", "inv"],
			buckets: [{ returnsBps: [0, 0], weight: 4294967296 }],
		}
		const { baseline, scenario, timeline } = fixture
		const survival = financialIndependence(baseline, scenario, timeline, { method: "survival" })
		const chance = financialIndependence(
			baseline,
			scenario,
			timeline,
			{ method: "probabilityThreshold", thresholdBps: 10_000, paths: 3, seed: "0000000000000000" },
			flat,
		)
		expect(survival.ok && survival.financialIndependence.reachable).toBe(true)
		expect(chance.ok && chance.financialIndependence.reachable).toBe(true)
		if (survival.ok && chance.ok) {
			const [left, right] = [survival.financialIndependence, chance.financialIndependence]
			expect(left.reachable && right.reachable && left.month === right.month).toBe(true)
		}
	})
})
