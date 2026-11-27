import { describe, expect, test } from "bun:test"
import { percentWords, trimPercent } from "./percent"

describe("percentWords", () => {
	test("drops the zeros after the point and the point itself, and nothing else", () => {
		expect(percentWords("5.00")).toBe("5")
		expect(percentWords("3.50")).toBe("3.5")
		expect(percentWords("1.25")).toBe("1.25")
		expect(percentWords("0.05")).toBe("0.05")
		expect(percentWords("10")).toBe("10")
		expect(percentWords("100.00")).toBe("100")
		expect(percentWords("0.00")).toBe("0")
	})
})

describe("trimPercent", () => {
	test("drops the zeros after the point of a percent and keeps the sign", () => {
		expect(trimPercent("96.50%")).toBe("96.5%")
		expect(trimPercent("4.00%")).toBe("4%")
		expect(trimPercent("0.05%")).toBe("0.05%")
		expect(trimPercent("100.00%")).toBe("100%")
		expect(trimPercent("-3.50%")).toBe("-3.5%")
	})

	test("leaves text that is not one percent as it came", () => {
		expect(trimPercent("96.50")).toBe("96.50")
		expect(trimPercent("about 96.50%")).toBe("about 96.50%")
		expect(trimPercent("")).toBe("")
	})
})
