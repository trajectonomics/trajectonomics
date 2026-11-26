import { describe, expect, test } from "bun:test"
import { MINUS } from "./money"
import { formatMultiple } from "./multiple"

describe("formatMultiple", () => {
	test("writes a multiple from basis points with one decimal", () => {
		expect(formatMultiple(145376)).toBe("14.5×")
		expect(formatMultiple(250000)).toBe("25.0×")
		expect(formatMultiple(0)).toBe("0.0×")
	})

	test("truncates toward zero, so a multiple below its reference never rounds up to it", () => {
		expect(formatMultiple(14500)).toBe("1.4×")
		expect(formatMultiple(14999)).toBe("1.4×")
		expect(formatMultiple(15000)).toBe("1.5×")
		expect(formatMultiple(249701)).toBe("24.9×")
		expect(formatMultiple(249999)).toBe("24.9×")
	})

	test("keeps the sign of a negative multiple, and prints none for a result of zero", () => {
		expect(formatMultiple(-145376)).toBe(`${MINUS}14.5×`)
		expect(formatMultiple(-15000)).toBe(`${MINUS}1.5×`)
		expect(formatMultiple(-999)).toBe("0.0×")
		expect(formatMultiple(999)).toBe("0.0×")
	})

	test("refuses a number that is not an integer of basis points", () => {
		expect(() => formatMultiple(14.5)).toThrow(RangeError)
	})
})
