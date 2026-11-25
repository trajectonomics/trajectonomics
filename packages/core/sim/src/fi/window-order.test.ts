import { describe, expect, it } from "bun:test"
import { expense } from "../engine/test-flows"
import { makeFixture, type Setup } from "../engine/test-helpers"
import { financialIndependence } from "../index"
import type { Milestone, Scenario } from "../types"

const shortfall: Setup = {
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 2e15 },
	flows: [expense("rent", 1e15, { frequency: "monthly", start: "2026-01-01" })],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2026-06-01",
	resolution: "month",
}

// Cash 2e15 and rent 1e15 each 1st from 1 Jan 2026. Cash is 1e15 after January and 0 after
// February, so the plan runs short on 1 Mar 2026 with 1e15 unmet. A twelve-month expense window
// is 12e15, past the safe integer range, so the Minimum buffer (12 months) cannot be priced:
// the window problem is dated 1 Jan 2026, before the shortfall.
function answer(milestones: readonly Milestone[], setup: Setup = shortfall) {
	const fixture = makeFixture(setup)
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

describe("a breach and a window problem on the same walk resolve by date", () => {
	// Cash 1,000; rent 100 a month; a once expense of 1 on 15 Jun 2026. On 1 Jun the twelve months
	// hold rent 1,200 and that 1, so 1,201 is required and the 400 left breaches. On the horizon,
	// 20 Jun, the twelve months reach 2 and 10 Jun 2027, where two once expenses of 5e15 sum past the
	// safe integer range: that window cannot be priced. The breach is the earlier finding, so it wins.
	const tie: Setup = {
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 1000 },
		flows: [
			expense("rent", 100, { frequency: "monthly", start: "2026-01-01" }),
			expense("small", 1, { frequency: "once", start: "2026-06-15" }),
			expense("huge-a", 5e15, { frequency: "once", start: "2027-06-02" }),
			expense("huge-b", 5e15, { frequency: "once", start: "2027-06-10" }),
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2026-06-20",
		resolution: "month",
	}
	const expected = {
		ok: true,
		financialIndependence: {
			reachable: false,
			binding: "minimumBuffer",
			bestCase: {
				month: "2026-06-01",
				bufferBreach: { date: "2026-06-01", required: 1201, accessible: 400 },
			},
		},
	}

	it("reports the earlier breach on both the shared and the per-candidate path", () => {
		expect(answer([], tie)).toMatchObject(expected)
		expect(answer([never], tie)).toMatchObject(expected)
	})
})
