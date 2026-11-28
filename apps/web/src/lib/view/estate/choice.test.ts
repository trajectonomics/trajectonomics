import { describe, expect, test } from "bun:test"
import { estateChoice } from "./choice"

describe("the Estate date the address asks for", () => {
	test("takes ?estate= when it is set", () => {
		expect(estateChoice("end", "life")).toBe("end")
		expect(estateChoice("milestone:car-paid-off", "")).toBe("milestone:car-paid-off")
	})

	test("falls back to an old ?at= that is not a month", () => {
		expect(estateChoice("", "life")).toBe("life")
		expect(estateChoice("", "milestone:car-paid-off")).toBe("milestone:car-paid-off")
	})

	test("a viewing month in ?at= is not an Estate choice, and neither parameter is the page's default", () => {
		expect(estateChoice("", "2031-03")).toBe("")
		expect(estateChoice("", "")).toBe("")
	})
})
