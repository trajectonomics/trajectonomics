import { describe, expect, test } from "bun:test"
import { formatBps, parseBps } from "./bps"

describe("formatBps", () => {
	test("moves the decimal point two places left, keeping two places", () => {
		expect(formatBps(300)).toBe("3.00")
		expect(formatBps(-50)).toBe("-0.50")
		expect(formatBps(5)).toBe("0.05")
		expect(formatBps(0)).toBe("0.00")
		expect(formatBps(1234)).toBe("12.34")
	})

	test("refuses a value that is not an integer", () => {
		expect(() => formatBps(3.5)).toThrow(RangeError)
	})
})

describe("parseBps", () => {
	test("reads a percent with two places back to its basis points", () => {
		expect(parseBps("3.00")).toBe(300)
		expect(parseBps("-0.50")).toBe(-50)
		expect(parseBps("-0.00")).toBe(0)
	})

	test("reads a whole percent and one place", () => {
		expect(parseBps("3")).toBe(300)
		expect(parseBps("3.5")).toBe(350)
		expect(parseBps("  4.25 ")).toBe(425)
	})

	test("refuses more than two places, so a rate is never rounded", () => {
		expect(parseBps("3.005")).toBeNull()
		expect(parseBps("3.")).toBeNull()
		expect(parseBps(".5")).toBeNull()
	})

	test("refuses text that is not a percent, and an empty field", () => {
		expect(parseBps("")).toBeNull()
		expect(parseBps("3%")).toBeNull()
		expect(parseBps("1e2")).toBeNull()
		expect(parseBps("3,50")).toBeNull()
	})

	test("round-trips with formatBps for the values the document holds", () => {
		for (const bps of [0, 1, 99, 100, 300, -50, 12345]) {
			expect(parseBps(formatBps(bps))).toBe(bps)
		}
	})
})
