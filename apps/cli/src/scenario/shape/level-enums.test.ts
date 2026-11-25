import { describe, expect, it } from "bun:test"
import { scenarioExample } from "./index"
import { nodeAt, probed, refusalsOf, VERSION } from "./testing"

/*
 * The rounding a `level` loan states (ADR-0016) is a closed set the published shape lists, so it is
 * probed here against the pinned core, as every other closed set is in enums.test.ts. Its path
 * is `flows.*.level.rounding`, which that test leaves to this file.
 */

const CASH = { id: "cash", kind: "asset", rate: 0 }
const LOAN = { id: "loan", kind: "liability", rate: 600, compounding: "monthly" }

/** A Scenario with one level contribution into the nominal liability `LOAN`, rounded `rounding`. */
function levelDocument(rounding: unknown): Record<string, unknown> {
	return {
		...scenarioExample(VERSION ?? 0),
		estate: {},
		accounts: [CASH, LOAN],
		flows: [
			{
				id: "loan-payment",
				kind: "contribution",
				target: "loan",
				frequency: "monthly",
				start: "2026-01-01",
				level: { principal: 100_000, payments: 12, rounding },
			},
		],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: [] },
	}
}

describe("the rounding a level loan states", () => {
	it("states every rounding the core accepts, and only those", () => {
		const values = nodeAt(["flows", "*", "level", "rounding"])["enum"] as string[]
		expect(values.length).toBeGreaterThan(0)
		for (const value of values) expect(refusalsOf(levelDocument(value))).toEqual([])
	})

	it("refuses a rounding outside the set, at that field", () => {
		expect(refusalsOf(levelDocument("down"))).toContainEqual({
			code: "INVALID_ROUNDING",
			path: probed(["flows", 0, "level", "rounding"]),
		})
	})
})
