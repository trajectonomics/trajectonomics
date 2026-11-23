import { describe, expect, it } from "bun:test"
import { employerShare } from "../engine/test-employer"
import { makeFixture } from "../engine/test-helpers"
import { chanceOfSuccess } from "../index"
import type { ReturnModel } from "../types"

const FULL = 4294967296

const flat: ReturnModel = {
	id: "flat",
	accounts: ["cash", "pvd"],
	buckets: [{ returnsBps: [0, 0], weight: FULL }],
}

/** No income, no cash and no spending: the only money is the employer's 1,000.00 a month into the fund. */
const fixture = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "pvd", kind: "asset", rate: 0 },
	],
	balances: { cash: 0, pvd: 0 },
	flows: [
		employerShare("pvd-employer", "pvd", 100_000, { frequency: "monthly", start: "2026-01-31" }),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	horizon: "2026-12-31",
	resolution: "month",
})

describe("chance of success with an employer Contribution", () => {
	it("lands the employer's share on every Market path, so a flat market ends at 12 × 1,000.00", () => {
		const result = chanceOfSuccess(fixture.baseline, fixture.scenario, fixture.timeline, {
			model: flat,
			seed: "0000000000000000",
			paths: 3,
		})
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.chance.successBps).toBe(10000)
		expect(result.chance.bands[0]?.netWorth.map((item) => item.value)).toEqual([
			1_200_000, 1_200_000, 1_200_000, 1_200_000, 1_200_000,
		])
	})
})
