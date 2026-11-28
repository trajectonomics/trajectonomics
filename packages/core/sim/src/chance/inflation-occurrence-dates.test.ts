import { describe, expect, it } from "bun:test"
import { dateWorkRuns } from "../engine/occurrence-dates"
import { makeFixture } from "../engine/test-helpers"
import { chanceOfSuccess } from "../index"
import type { ReturnModel } from "../types"

const FULL = 4_294_967_296
const PATHS = 6

const fixture = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 0 },
	flows: [
		{
			id: "living",
			kind: "expense",
			amount: 100_000,
			frequency: "monthly",
			start: "2026-01-31",
			growth: "inflation",
		},
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	inflation: 300,
	horizon: "2030-01-01",
})

/** A market of no Accounts that still draws a two-bucket inflation factor per path (ADR 0033). */
const model: ReturnModel = {
	id: "inflation-only",
	accounts: [],
	buckets: [
		{ returnsBps: [], weight: FULL / 2 },
		{ returnsBps: [], weight: FULL / 2 },
	],
	inflation: {
		buckets: [
			{ rateBps: 200, weight: FULL / 2 },
			{ rateBps: 400, weight: FULL / 2 },
		],
	},
}

describe("a chance run with a drawn inflation factor", () => {
	it("computes the declared Scenario's Occurrence dates once for all paths", () => {
		const result = chanceOfSuccess(fixture.baseline, fixture.scenario, fixture.timeline, {
			model,
			seed: "0123456789abcdef",
			paths: PATHS,
		})

		expect(result.ok).toBe(true)
		expect(dateWorkRuns(fixture.scenario)).toBe(1)
	})
})
