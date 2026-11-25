import { describe, expect, it } from "bun:test"
import { expense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { chanceOfSuccess } from "../index"
import type { ReturnModel } from "../types"

/** Every month doubles the balance, so 9 × 10^15 minor units leaves the safe-integer range at once. */
const doubles: ReturnModel = {
	id: "doubles",
	accounts: ["cash"],
	buckets: [{ returnsBps: [10000], weight: 4294967296 }],
}

const huge = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 9_000_000_000_000_000 },
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	horizon: "2026-03-31",
	resolution: "month",
})

const crash: ReturnModel = {
	id: "crash",
	accounts: ["cash"],
	buckets: [{ returnsBps: [-9999], weight: 4294967296 }],
}

/**
 * 100,000 crashes to 10 by Feb 1 and to 0 by Mar 1 (half up), so 2026 closes at 0. The first bill is
 * on 2027-01-15, so every path runs out in the second Annual roll-up, not the first.
 */
const lateBill = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 100_000 },
	flows: [expense("bill", 60_000, { start: "2027-01-15" })],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	horizon: "2027-12-31",
	resolution: "month",
})

describe("chanceOfSuccess when a path runs out after the first roll-up", () => {
	it("counts the failure in the period it happens in and reports none in the first", () => {
		const result = chanceOfSuccess(lateBill.baseline, lateBill.scenario, lateBill.timeline, {
			model: crash,
			seed: "0000000000000000",
			paths: 2,
		})
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.chance.succeeded).toBe(0)
		expect(result.chance.runsOut).toEqual([
			{ index: 0, to: "2026-12-31", paths: 0 },
			{ index: 1, to: "2027-12-31", paths: 2 },
		])
		expect(result.chance.bands.map((band) => band.netWorth[2]!.value)).toEqual([0, 0])
	})
})

describe("chanceOfSuccess when a path's run fails", () => {
	it("returns the run's problem for the whole call, not a partial chance", () => {
		const result = chanceOfSuccess(huge.baseline, huge.scenario, huge.timeline, {
			model: doubles,
			seed: "0000000000000000",
			paths: 3,
		})
		expect(result.ok).toBe(false)
		if (result.ok) return
		expect(result.problems).toHaveLength(1)
		expect(result.problems[0]!.code).toBe("VALUE_OVERFLOW")
	})
})
