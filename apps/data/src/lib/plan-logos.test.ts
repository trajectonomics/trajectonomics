import { describe, expect, test } from "bun:test"
import { plans } from "@trajectonomics/data-collector/plans"
import { planLogo, planLogos } from "./plan-logos"

const PLAN_IDS = new Set(plans.map((plan) => plan.id as string))

describe("the plan logos", () => {
	test("are keyed by ids the plan table names", () => {
		for (const id of Object.keys(planLogos)) expect(PLAN_IDS.has(id)).toBe(true)
	})

	test("carry a non-empty path with no fill and no colour", () => {
		for (const logo of Object.values(planLogos)) {
			expect(logo?.path.length ?? 0).toBeGreaterThan(0)
			expect(logo?.path ?? "").not.toMatch(/fill|#/)
		}
	})

	test("leave a plan with no mark to its initial", () => {
		expect(planLogo("command-code")).toBeNull()
		expect(planLogo("a-plan-we-do-not-know")).toBeNull()
	})
})
