import { describe, expect, it } from "bun:test"
import { expense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { ChanceOfSuccessOptions, Milestone, ReturnModel, Scenario } from "../types"
import { chanceOfSuccess } from "./chance-of-success"

/** One flat month, so every Market path is the same deterministic plan. */
const flat: ReturnModel = {
	id: "flat",
	accounts: ["cash"],
	buckets: [{ returnsBps: [0], weight: 4294967296 }],
}
const options: ChanceOfSuccessOptions = { model: flat, seed: "0123456789abcdef", paths: 2 }

/** Cash of 1,000 and rent of 600 on each 1st from 1 Jan 2026: the second payment runs out. */
function scenarioWith(milestones?: readonly Milestone[]): Scenario {
	const gate = milestones === undefined ? {} : { endAt: "stop" }
	const rent = expense("rent", 600, { frequency: "monthly", start: "2026-01-01", ...gate })
	const fixture = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 1000 },
		flows: [rent],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2026-06-01",
	})
	return milestones === undefined ? fixture.scenario : { ...fixture.scenario, milestones }
}

const stop: Milestone = {
	id: "stop",
	combine: "all",
	criteria: [{ id: "c", kind: "date", on: "2026-02-01" }],
}

describe("chanceOfSuccess runs every Market path through the Milestone gates", () => {
	it("succeeds only once the gate stops the second rent payment", () => {
		const { baseline, timeline } = makeFixture({
			accounts: [{ id: "cash", kind: "asset", rate: 0 }],
			balances: { cash: 1000 },
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			start: "2026-01-01",
			horizon: "2026-06-01",
		})
		// Ungated: the 1 Feb rent runs cash short, so every path runs out.
		const ungated = chanceOfSuccess(baseline, scenarioWith(), timeline, options)
		expect(ungated.ok && ungated.chance.successBps).toBe(0)
		// Gated at 1 Feb (rent lands strictly before it): only the 1 Jan payment, cash 400.
		const gated = chanceOfSuccess(baseline, scenarioWith([stop]), timeline, options)
		expect(gated.ok && gated.chance.successBps).toBe(10000)
	})
})
