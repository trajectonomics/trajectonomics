import { describe, expect, test } from "bun:test"
import { compareMoney } from "./order"

describe("compareMoney", () => {
	test.each([
		["9.99", "10.00", -1],
		["10.00", "9.99", 1],
		["100.00", "100.00", 0],
		["0.00", "-0.00", 0],
		["-5.00", "3.00", -1],
		["3.00", "-5.00", 1],
		["-10.00", "-9.00", -1],
		["-9.00", "-10.00", 1],
		["1.5", "1.50", 0],
		["1.05", "1.5", -1],
		["007.00", "7.00", 0],
		["12345678901234567890.01", "12345678901234567890.02", -1],
	])("%s against %s is %i, by digits and with no number made", (a, b, expected) => {
		expect(compareMoney(a, b)).toBe(expected as -1 | 0 | 1)
	})

	test("a string that is not a decimal sorts after every decimal", () => {
		expect(compareMoney("n/a", "5.00")).toBe(1)
		expect(compareMoney("5.00", "n/a")).toBe(-1)
		expect(compareMoney("n/a", "n/a")).toBe(0)
	})
})
