import { describe, expect, it } from "bun:test"
import { SIM_SCENARIO } from "./baseline/fixture"
import {
	AS_OF,
	baseFlags,
	dateFlags,
	errorOf,
	projection,
	projectionHome,
} from "./projection/testing"
import { closingOf, echoed } from "./projection-what-if-support"
import { applyScenario } from "./scenario-test-support"

/** A Scenario whose derived expense reads the investment Flow's landed amount (a non-earned Flow). */
function derivedScenario() {
	return {
		...SIM_SCENARIO,
		flows: [
			...SIM_SCENARIO.flows,
			{
				id: "tenth",
				kind: "expense",
				frequency: "monthly",
				start: AS_OF,
				derive: {
					measures: [
						{ id: "pay", op: "flow", flow: "invest" },
						{ id: "tenth", op: "scale", of: "pay", num: 1, den: 10, rounding: "floor" },
					],
					result: "tenth",
				},
			},
		],
	}
}

describe("projection run --without", () => {
	it("takes one list item out of the run and echoes the removal, with no Override", async () => {
		const home = await projectionHome()
		const plain = await projection(home, ["run", ...baseFlags()])
		const without = await projection(home, ["run", ...baseFlags(), "--without", "flows.rent"])
		expect(without.code).toBe(0)
		const body = echoed(without)
		expect(body.removals).toEqual(["flows.rent"])
		expect(body.overrides).toEqual([])
		expect(body.scenario.effectiveContentHash).not.toBe(body.scenario.contentHash)
		expect(closingOf(without)).not.toBe(closingOf(plain))
		expect(echoed(plain).removals).toEqual([])
	})

	it("never writes: the stored Scenario keeps its hash after a removal", async () => {
		const home = await projectionHome()
		const before = echoed(await projection(home, ["run", ...baseFlags()])).scenario.contentHash
		await projection(home, ["run", ...baseFlags(), "--without", "flows.rent"])
		const after = echoed(await projection(home, ["run", ...baseFlags()])).scenario.contentHash
		expect(after).toBe(before)
	})

	it("refuses a Set on the removed item at the --set, as an unknown id", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			"--without",
			"flows.rent",
			"--set",
			"flows.rent.amount=1",
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--set",
			details: { index: 0, segment: "rent" },
		})
	})

	it("refuses a path that is not a list item, at the --without, with the hint", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["run", ...baseFlags(), "--without", "economy.inflation"])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error).toMatchObject({
			code: "invalid_input",
			path: "--without",
			details: { index: 0, path: "economy.inflation" },
		})
		expect(error.hint).toContain("--without takes a list item")
		expect(error.hint).toContain("--set replaces a value")
	})

	it("refuses an unknown id with the nearest id as the suggestion", async () => {
		const home = await projectionHome()
		const res = await projection(home, ["run", ...baseFlags(), "--without", "flows.rnet"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			path: "--without",
			details: { segment: "rnet", suggestion: "flows.rent" },
		})
	})

	it("refuses a repeated path, as a duplicate --set is refused", async () => {
		const home = await projectionHome()
		const res = await projection(home, [
			"run",
			...baseFlags(),
			"--without",
			"flows.rent",
			"--without",
			"flows.rent",
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			path: "--without",
			details: { index: 1, path: "flows.rent" },
		})
	})

	it("refuses removing a Flow a derive graph reads, at that --without", async () => {
		const home = await projectionHome()
		const applied = await applyScenario(home, "derived", derivedScenario())
		expect(applied.code).toBe(0)
		const res = await projection(home, [
			"run",
			"--scenario",
			"derived",
			...dateFlags(),
			"--without",
			"flows.invest",
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--without",
			details: { index: 0, path: "flows.invest" },
		})
	})
})
