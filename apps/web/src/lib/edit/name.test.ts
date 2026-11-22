import { describe, expect, test } from "bun:test"
import { planNameError } from "./name"

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
