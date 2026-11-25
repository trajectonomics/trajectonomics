import { describe, expect, test } from "bun:test"
import { directedAmount, totalDirection } from "./direction"

/** A CLI amount and the digits a person reads: the string itself, or itself without its leading minus. */
const AMOUNTS = [
	"-900000.00",
	"348500.00",
	"-0.01",
	"0.00",
	"-184000.00",
	"123456789012345.67",
	"-999999999999999.99",
	"7.10",
] as const

describe("directedAmount", () => {
	test("never changes a digit: the digits are the CLI's string with at most its leading minus removed", () => {
		for (const amount of AMOUNTS) {
			const { digits } = directedAmount(amount, "income")
			const expected = amount.startsWith("-") ? amount.slice(1) : amount
			expect(digits).toBe(expected)
			expect(digits.replace("-", "")).toBe(amount.replace("-", ""))
		}
	})

	test("words income, expenses and liabilities by their meaning", () => {
		expect(directedAmount("-900000.00", "income")).toEqual({
			word: "Money in",
			digits: "900000.00",
		})
		expect(directedAmount("348500.00", "expense")).toEqual({
			word: "Money out",
			digits: "348500.00",
		})
		expect(directedAmount("-184000.00", "liability")).toEqual({
			word: "You owe",
			digits: "184000.00",
		})
	})

	test("reads a one-satang amount and a zero without losing a place", () => {
		expect(directedAmount("-0.01", "expense").digits).toBe("0.01")
		expect(directedAmount("0.00", "income").digits).toBe("0.00")
	})

	test("keeps a large amount's every digit", () => {
		expect(directedAmount("-999999999999999.99", "liability")).toEqual({
			word: "You owe",
			digits: "999999999999999.99",
		})
	})
})

describe("totalDirection", () => {
	test("reads a positive profit and loss total as money in and a negative one as money out", () => {
		expect(totalDirection("78449.51")).toBe("income")
		expect(totalDirection("0.00")).toBe("income")
		expect(totalDirection("-12.00")).toBe("expense")
	})
})
