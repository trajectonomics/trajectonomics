import { describe, expect, test } from "bun:test"
import { MAX_PLAN_NAME, planNameError, planNameShapeError } from "./name"

describe("planNameError", () => {
	test("accepts a name no plan has", () => {
		expect(planNameError("early", ["base"])).toBeNull()
	})

	test("refuses an empty name, and one that only has spaces", () => {
		expect(planNameError("", ["base"])).toBe("Enter a name for the copy.")
		expect(planNameError("   ", ["base"])).toBe("Enter a name for the copy.")
	})

	test("refuses a name a plan already has, after trimming, and is case-sensitive", () => {
		expect(planNameError(" base ", ["base"])).toBe("A plan named base already exists.")
		expect(planNameError("Base", ["base"])).toBeNull()
	})
})

describe("planNameShapeError", () => {
	test("refuses a name traj would read as a flag", () => {
		for (const name of ["--help", "-h", "--dry-run", "-"]) {
			expect(planNameShapeError(name)).toBe("A plan name cannot start with -.")
		}
		expect(planNameError(" --help", ["base"])).toBe("A plan name cannot start with -.")
	})

	test("refuses a line break or a control character, and a name over the limit", () => {
		expect(planNameShapeError("a\nb")).toBe(
			"A plan name cannot hold a line break or a control character.",
		)
		expect(planNameShapeError("a\u007fb")).toBe(
			"A plan name cannot hold a line break or a control character.",
		)
		expect(planNameShapeError("x".repeat(MAX_PLAN_NAME))).toBeNull()
		expect(planNameShapeError("x".repeat(MAX_PLAN_NAME + 1))).toBe(
			"A plan name is at most 100 characters.",
		)
	})

	test("accepts a hyphen inside a name, spaces and letters beyond ASCII", () => {
		expect(planNameShapeError("retire-early")).toBeNull()
		expect(planNameShapeError("เกษียณ 55")).toBeNull()
	})
})
