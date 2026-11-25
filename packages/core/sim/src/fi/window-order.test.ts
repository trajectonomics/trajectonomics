import { describe, expect, it } from "bun:test"
import { expense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { financialIndependence } from "../index"
import type { Milestone, Scenario } from "../types"

// Cash 2e15 and rent 1e15 each 1st from 1 Jan 2026. Cash is 1e15 after January and 0 after
// February, so the plan runs short on 1 Mar 2026 with 1e15 unmet. A twelve-month expense window
// is 12e15, past the safe integer range, so the Minimum buffer (12 months) cannot be priced:
// the window problem is dated 1 Jan 2026, before the shortfall.
function answer(milestones: readonly Milestone[]) {
	const fixture = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 2e15 },
		flows: [expense("rent", 1e15, { frequency: "monthly", start: "2026-01-01" })],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2026-06-01",
		resolution: "month",
	})
	const scenario: Scenario =
		milestones.length === 0
			? fixture.scenario
			: { ...fixture.scenario, milestones: [...milestones] }
	return financialIndependence(fixture.baseline, scenario, fixture.timeline, {
		method: "survival",
		minBufferMonths: 12,
	})
}

/** Never fires: net worth stays far below this amount, so the walk is dynamic but unchanged. */
const never: Milestone = {
	id: "never",
	combine: "all",
	criteria: [
		{ id: "c", kind: "metric", metric: "netWorth", op: "atLeast", amount: 9e15, terms: "nominal" },
	],
}

describe("a Shortfall outranks a window problem on every walk path", () => {
	it("reports the Shortfall on a shared table, though the window problem comes first by date", () => {
		// No dynamic Milestone, so every candidate shares one table, checked day by day in the walk.
		// The problem at 1 Jan is kept; the Shortfall on 1 Mar wins over it.
		expect(answer([])).toMatchObject({
			ok: true,
			financialIndependence: {
				reachable: false,
				binding: "insufficientMoney",
				bestCase: { month: "2026-01-01", runsOut: { date: "2026-03-01" } },
			},
		})
	})

	it("reports the Shortfall on a per-candidate walk, which checks its windows only at the end", () => {
		// A dynamic Milestone gives each candidate its own windows, built after its walk. The walk
		// ends on the Shortfall first, so the window problem is never reported.
		expect(answer([never])).toMatchObject({
			ok: true,
			financialIndependence: {
				reachable: false,
				binding: "insufficientMoney",
				bestCase: { month: "2026-01-01", runsOut: { date: "2026-03-01" } },
			},
		})
	})
})
