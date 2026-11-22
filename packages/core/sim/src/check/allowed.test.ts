import { describe, expect, it } from "bun:test"
import { check } from "../index"
import { SCENARIO_SCHEMA_VERSION } from "../vocab"
import { allowedValues } from "./allowed"

const BASELINE = { schemaVersion: 1, balances: [] }

/** The problem of `code` that `check()` finds in a Scenario made of the version and the parts given. */
function problemOf(code: string, parts: Record<string, unknown>) {
	const scenario = { schemaVersion: SCENARIO_SCHEMA_VERSION, ...parts }
	const problem = check(BASELINE, scenario, null).find((found) => found.code === code)
	if (problem === undefined) throw new Error(`expected ${code}`)
	return problem
}

const FLOW = { id: "f", kind: "income", frequency: "monthly", start: "2026-01-01" }

describe("allowedValues", () => {
	it("lists a Flow's kinds for a Flow, an Account's for an Account", () => {
		const flow = problemOf("INVALID_KIND", { flows: [{ ...FLOW, kind: "payment" }] })
		expect(flow.code).toBe("INVALID_KIND")
		expect(allowedValues(flow.code, flow.path)).toEqual(["income", "expense", "contribution"])
		const account = problemOf("INVALID_KIND", { accounts: [{ id: "a", kind: "cash", rate: 0 }] })
		expect(allowedValues(account.code, account.path)).toEqual(["asset", "liability"])
	})

	it("lists the frequencies for a frequency the core refuses", () => {
		const problem = problemOf("INVALID_FREQUENCY", { flows: [{ ...FLOW, frequency: "yearly" }] })
		expect(problem.code).toBe("INVALID_FREQUENCY")
		expect(allowedValues(problem.code, problem.path)).toEqual([
			"once",
			"daily",
			"weekly",
			"biweekly",
			"monthly",
			"quarterly",
			"annual",
		])
	})

	it("leaves out the op each kind of graph may not hold", () => {
		const derive = { measures: [{ id: "r", op: "tally", label: "x", basis: "gross" }] }
		const problem = problemOf("INVALID_OP", { flows: [{ ...FLOW, derive }] })
		expect(problem.code).toBe("INVALID_OP")
		expect(allowedValues(problem.code, problem.path)).not.toContain("tally")
		expect(allowedValues("INVALID_OP", ["levies", 0, "measures", 0, "op"])).not.toContain("flow")
	})

	it("is undefined for a code that is not a closed list", () => {
		expect(allowedValues("INVALID_GROWTH", ["flows", 0, "growth"])).toBeUndefined()
		expect(allowedValues("INVALID_KIND", ["somewhere"])).toBeUndefined()
	})
})
