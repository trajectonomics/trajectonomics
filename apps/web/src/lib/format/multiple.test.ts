import { describe, expect, test } from "bun:test"
import { formatMultiple } from "./multiple"

describe("formatMultiple", () => {
	test("writes a multiple from basis points with one decimal", () => {
		expect(formatMultiple(145376)).toBe("14.5×")
		expect(formatMultiple(250000)).toBe("25.0×")
		expect(formatMultiple(0)).toBe("0.0×")
	})

	test("rounds half up", () => {
		expect(formatMultiple(14500)).toBe("1.5×")
		expect(formatMultiple(14499)).toBe("1.4×")
	})

	test("keeps the sign of a negative multiple", () => {
		expect(formatMultiple(-145376)).toBe("-14.5×")
	})

	test("refuses a number that is not an integer of basis points", () => {
		expect(() => formatMultiple(14.5)).toThrow(RangeError)
	})
})
