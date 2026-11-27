import { describe, expect, it } from "bun:test"
import { pathOutcomes } from "./outcomes"
import type { PathOutcome } from "./path-outcome"

/** One path that fired a Milestone whose id is `__proto__`, the one id a plain object assignment loses. */
function fired(): PathOutcome {
	return {
		netWorth: [100, 120],
		lowest: { value: 100, at: 0 },
		milestones: [
			{ id: "__proto__", reached: true, date: "2030-01-01" },
			{ id: "later", reached: false },
		],
	} as unknown as PathOutcome
}

describe("a path's fire dates by id", () => {
	it("keeps a Milestone whose id is __proto__ as an ordinary key", () => {
		const [outcome] = pathOutcomes([fired()], true)
		const dates = outcome?.milestones ?? {}
		expect(Object.keys(dates)).toEqual(["__proto__"])
		expect(Object.getOwnPropertyDescriptor(dates, "__proto__")?.value).toBe("2030-01-01")
	})

	it("carries no fire dates without the option", () => {
		const [outcome] = pathOutcomes([fired()], false)
		expect(outcome && "milestones" in outcome).toBe(false)
	})
})
