import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { PlanStats as Stats } from "../../lib/view/projection/plan"
import PlanStats from "./PlanStats.svelte"

const STATS: Stats = {
	stopWorking: null,
	runsOut: null,
	closing: { amount: "1550000.00", year: "2028" },
	chance: "87%",
}

describe("PlanStats", () => {
	test("says when the money runs out, in the accent colour, where Stop working would be", () => {
		const { body } = render(PlanStats, {
			props: { stats: { ...STATS, runsOut: { month: "Jun 2027" } } },
		})
		expect(body).toContain("Money runs out")
		expect(body).toContain(">Jun 2027<")
		expect(body).toContain("text-accent")
		expect(body).not.toContain("Stop working")
	})

	test("states the stop-working month when the plan does not run out", () => {
		const { body } = render(PlanStats, {
			props: { stats: { ...STATS, stopWorking: { month: "Mar 2041", date: "1 Mar 2041" } } },
		})
		expect(body).toContain("Stop working")
		expect(body).toContain(">Mar 2041<")
		expect(body).not.toContain("Money runs out")
	})

	test("draws the closing figure and the chance beside it", () => {
		const { body } = render(PlanStats, { props: { stats: STATS } })
		expect(body).toContain("At the end, 2028")
		expect(body).toContain("1.55M")
		expect(body).toContain("Chance of success")
		expect(body).toContain("87%")
	})
})
