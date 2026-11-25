import { describe, expect, test } from "bun:test"
import { directedAmount } from "./direction"

/** A CLI amount and the digits a person reads: the string itself, or itself without its leading minus. */
const AMOUNTS = [
	"-900000.00",
	"348500.00",
	"-0.01",
	"0.00",
	"-184000.00",
	"123456789012345.67",
	"-90071992547409.91",
	"7.10",
] as const

describe("directedAmount", () => {
	test("never changes a digit: the digits are the CLI's string with at most its leading minus removed", () => {
		for (const amount of AMOUNTS) {
			const { digits } = directedAmount(amount, "money")
			const expected = amount.startsWith("-") ? amount.slice(1) : amount
			expect(digits).toBe(expected)
			expect(digits.replace("-", "")).toBe(amount.replace("-", ""))
		}
	})

	test("reads a row's sign as money in or money out, whatever the account type", () => {
		expect(directedAmount("-900000.00", "money")).toEqual({
			word: "Money in",
			digits: "900000.00",
		})
		expect(directedAmount("348500.00", "money")).toEqual({
			word: "Money out",
			digits: "348500.00",
		})
		// A refund of an expense is money in, and a reversal of income is money out (#585).
		expect(directedAmount("-1500.00", "money")).toEqual({ word: "Money in", digits: "1500.00" })
		expect(directedAmount("700.00", "money")).toEqual({ word: "Money out", digits: "700.00" })
	})

	test("reads a liability's sign as what you owe, or as what is owed to you", () => {
		expect(directedAmount("-184000.00", "owed")).toEqual({
			word: "You owe",
			digits: "184000.00",
		})
		// An overpaid liability is money owed to you, not money you owe (#585).
		expect(directedAmount("50.00", "owed")).toEqual({ word: "Owed to you", digits: "50.00" })
	})

	test("reads a net total as income less expenses: positive is money in and negative money out", () => {
		expect(directedAmount("78449.51", "net")).toEqual({ word: "Money in", digits: "78449.51" })
		expect(directedAmount("-12.00", "net")).toEqual({ word: "Money out", digits: "12.00" })
	})

	test("gives zero no direction word, whether the CLI writes a sign or not", () => {
		for (const amount of ["0.00", "-0.00"]) {
			expect(directedAmount(amount, "money")).toEqual({ word: null, digits: "0.00" })
			expect(directedAmount(amount, "owed")).toEqual({ word: null, digits: "0.00" })
			expect(directedAmount(amount, "net")).toEqual({ word: null, digits: "0.00" })
		}
	})

	test("reads a one-satang amount and a zero without losing a place", () => {
		expect(directedAmount("-0.01", "money").digits).toBe("0.01")
		expect(directedAmount("0.00", "money").digits).toBe("0.00")
	})

	test("keeps a large amount's every digit", () => {
		expect(directedAmount("-90071992547409.91", "owed")).toEqual({
			word: "You owe",
			digits: "90071992547409.91",
		})
	})
})
