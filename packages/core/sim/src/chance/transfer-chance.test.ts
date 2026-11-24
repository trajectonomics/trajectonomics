import { describe, expect, it } from "bun:test"
import { expense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { transfer } from "../engine/test-transfer"
import { chanceOfSuccess } from "../index"
import type { Flow, ReturnModel } from "../types"

const FULL = 4294967296

const flat: ReturnModel = {
	id: "flat",
	accounts: ["cash", "rmf"],
	buckets: [{ returnsBps: [0, 0], weight: FULL }],
}

/** Cash of 1,200,000 and a locked RMF; living costs 100,000 a month for the 12 months of 2026. */
function plan(flows: readonly Flow[]) {
	return makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "rmf", kind: "asset", rate: 0, lockedUntil: "2040-01-01" },
		],
		balances: { cash: 1_200_000 },
		flows: [expense("living", 100_000, { frequency: "monthly", start: "2026-01-31" }), ...flows],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		horizon: "2026-12-31",
		resolution: "month",
	})
}

function successBps(flows: readonly Flow[]): number {
	const { baseline, scenario, timeline } = plan(flows)
	const result = chanceOfSuccess(baseline, scenario, timeline, {
		model: flat,
		seed: "0000000000000000",
		paths: 3,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.chance.successBps
}

describe("chance of success with a transfer", () => {
	// 12 × 100,000 is exactly the 1,200,000 held: every flat path survives. Locking 600,000 away on 1 January leaves
	// 600,000, which runs out in the seventh month on every path.
	it("lands the transfer on every Market path: the cash locked away no longer pays the living", () => {
		expect(successBps([])).toBe(10_000)
		expect(successBps([transfer("lock", "cash", "rmf", 600_000, { start: "2026-01-01" })])).toBe(0)
	})
})
