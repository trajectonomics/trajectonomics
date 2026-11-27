import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { formatCompact } from "./compact"

describe("formatCompact", () => {
	test("writes an amount of seven to nine whole digits in millions", () => {
		expect(formatCompact("1214900.00")).toBe("1.21M")
		expect(formatCompact("7514766.37")).toBe("7.51M")
		expect(formatCompact("15671500.52")).toBe("15.6M")
		expect(formatCompact("16775132.11")).toBe("16.7M")
		expect(formatCompact("21015713.51")).toBe("21M")
	})

	test("writes thousands with the leading digits, and no point when the fraction is zero", () => {
		expect(formatCompact("1000.00")).toBe("1k")
		expect(formatCompact("1009.99")).toBe("1k")
		expect(formatCompact("99000.00")).toBe("99k")
		expect(formatCompact("91700.00")).toBe("91.7k")
		expect(formatCompact("184000.00")).toBe("184k")
		expect(formatCompact("862256.24")).toBe("862k")
	})

	test("truncates toward zero, so a card never states more than the CLI did", () => {
		expect(formatCompact("999999.99")).toBe("999k")
	})

	test("keeps a small amount exact, as formatMoney shows it", () => {
		expect(formatCompact("950.25")).toBe("950.25")
		expect(formatCompact("0.00")).toBe("0.00")
	})

	test("prints a negative amount with the true minus sign", () => {
		expect(formatCompact("-184000.00")).toBe("−184k")
		expect(formatCompact("-0.50")).toBe("−0.50")
	})

	test("keeps billions as the largest unit, grouped", () => {
		expect(formatCompact("1234567890123.00")).toBe("1,234B")
		expect(formatCompact("10000000000.00")).toBe("10B")
	})

	test("returns a string that is not a decimal as it came", () => {
		expect(formatCompact("abc")).toBe("abc")
		expect(formatCompact("")).toBe("")
		expect(formatCompact("1,000.00")).toBe("1,000.00")
	})

	test("is string operations only: no Number, parseFloat, Math or toFixed", async () => {
		const source = await Bun.file(join(import.meta.dir, "compact.ts")).text()
		for (const forbidden of ["Number(", "parseFloat", "Math.", "toFixed"]) {
			expect(source, `compact.ts contains ${forbidden}`).not.toContain(forbidden)
		}
	})
})
