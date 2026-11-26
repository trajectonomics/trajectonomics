import { describe, expect, test } from "bun:test"
import { abbreviate } from "./abbreviate"
import { formatArgv } from "./argv"
import { formatDate, formatMonth } from "./date"
import { AMOUNT_MASK, maskMoney } from "./mask"
import { formatMoney } from "./money"
import { formatShare } from "./share"

describe("formatMoney", () => {
	test("groups the digits of a negative amount and uses the true minus sign", () => {
		expect(formatMoney("-1234567.50")).toBe("−1,234,567.50")
	})

	test("keeps a short amount ungrouped and its two places as given", () => {
		expect(formatMoney("12.00")).toBe("12.00")
		expect(formatMoney("-0.50")).toBe("−0.50")
	})

	test("groups an amount of exactly one thousand", () => {
		expect(formatMoney("1000.00")).toBe("1,000.00")
	})

	test("returns a string that is not a decimal as it came", () => {
		expect(formatMoney("1,000.00")).toBe("1,000.00")
		expect(formatMoney("")).toBe("")
	})
})

describe("formatDate and formatMonth", () => {
	test("prints a calendar date as day, month and year", () => {
		expect(formatDate("2026-10-31")).toBe("31 Oct 2026")
		expect(formatDate("2026-02-01")).toBe("1 Feb 2026")
	})

	test("refuses to print a date that is not a calendar day, and returns it as it came", () => {
		expect(formatDate("2026-13-01")).toBe("2026-13-01")
		expect(formatDate("2026-02-31")).toBe("2026-02-31")
		expect(formatDate("2024-02-29")).toBe("29 Feb 2024")
		expect(formatDate("tomorrow")).toBe("tomorrow")
	})

	test("prints the month of a date", () => {
		expect(formatMonth("2026-10-31")).toBe("Oct 2026")
	})

	test("prints a month on its own, and refuses a month that is not one", () => {
		expect(formatMonth("1990-06")).toBe("Jun 1990")
		expect(formatMonth("1990-13")).toBe("1990-13")
		expect(formatMonth("June")).toBe("June")
	})
})

describe("formatArgv", () => {
	test("starts with traj and leaves plain arguments bare", () => {
		expect(formatArgv(["doctor", "--as-of", "2026-10-31", "--json"])).toBe(
			"traj doctor --as-of 2026-10-31 --json",
		)
	})

	test("keeps the stdin marker bare", () => {
		expect(formatArgv(["projection", "run", "--carry-in", "-"])).toBe(
			"traj projection run --carry-in -",
		)
	})

	test("single-quotes an argument with a space, and escapes a quote inside one", () => {
		expect(formatArgv(["tx", "list", "--memo", "rent in May"])).toBe(
			"traj tx list --memo 'rent in May'",
		)
		expect(formatArgv(["--memo", "it's"])).toBe("traj --memo 'it'\\''s'")
	})

	test("quotes an empty argument so a person can see it", () => {
		expect(formatArgv(["--name", ""])).toBe("traj --name ''")
	})
})

describe("abbreviate", () => {
	test("abbreviates millions and thousands to one decimal place", () => {
		expect(abbreviate(1200000)).toBe("1.2M")
		expect(abbreviate(250000)).toBe("250k")
		expect(abbreviate(1500)).toBe("1.5k")
	})

	test("leaves a small value as a plain number", () => {
		expect(abbreviate(0)).toBe("0")
		expect(abbreviate(250)).toBe("250")
	})

	test("prints a negative value with the true minus sign", () => {
		expect(abbreviate(-2000000)).toBe("−2M")
	})

	test("refuses a value that is not finite", () => {
		expect(() => abbreviate(Number.NaN)).toThrow(RangeError)
	})
})

describe("maskMoney", () => {
	test("hides the digits of a positive amount behind the mask alone", () => {
		expect(maskMoney("1,082,000.00")).toBe(AMOUNT_MASK)
	})

	test("keeps the sign of a negative amount in front of the mask", () => {
		expect(maskMoney("−184,000.00")).toBe(`−${AMOUNT_MASK}`)
		expect(maskMoney("-184000.00")).toBe(`−${AMOUNT_MASK}`)
	})
})

describe("formatShare", () => {
	test("writes basis points as a percentage with two places", () => {
		expect(formatShare(8730)).toBe("87.30%")
		expect(formatShare(10000)).toBe("100.00%")
		expect(formatShare(5)).toBe("0.05%")
		expect(formatShare(0)).toBe("0.00%")
	})
})
