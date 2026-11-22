import { describe, expect, it } from "bun:test"
import { taxYear } from "./tax-year"

const ROW = {
	levy: "th-2026-pit",
	from: "2026-01-01",
	to: "2026-12-31",
	settlementDate: "2027-03-31",
	due: "6000.00",
	prepaid: "0.00",
	owed: "6000.00",
	settled: true,
	partial: false,
	assumptions: [],
}

describe("the taxYear contract", () => {
	it("parses a row that carries the breakdown the CLI reports (cli ADR 0052)", () => {
		const row = {
			...ROW,
			taxableIncome: "220000.00",
			progressiveTax: "3500.00",
			notes: ["The minimum tax applied: 6000.00 on Section 40(2)–(8) income (Section 48(2))."],
		}
		expect(taxYear.parse(row)).toEqual(row)
	})

	it("still parses a row without them, and refuses a field it does not know", () => {
		expect(taxYear.parse(ROW)).toEqual(ROW)
		expect(taxYear.safeParse({ ...ROW, extra: 1 }).success).toBe(false)
	})
})
