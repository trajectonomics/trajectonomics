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

	it("parses a row without them, and refuses a field it does not know", () => {
		expect(taxYear.parse(ROW)).toEqual(ROW)
		expect(taxYear.safeParse({ ...ROW, extra: 1 }).success).toBe(false)
	})

	it("parses a separate filing's Filer on the row, and a row of one Return without it (cli ADR 0075)", () => {
		const separate = { ...ROW, levy: "th-2026-pit@me", filer: "me" }
		expect(taxYear.parse(separate)).toEqual(separate)
		expect(taxYear.parse(ROW)).not.toHaveProperty("filer")
	})

	it("parses the walk, the brackets and the rates a Thai Levy adds (cli ADR 0036), each optional", () => {
		const row = {
			...ROW,
			walk: {
				assessable: "560000.00",
				expenses: "100000.00",
				allowances: "60000.00",
				taxableIncome: "400000.00",
			},
			brackets: [
				{ from: "0.00", upTo: "150000.00", rateBps: 0, income: "150000.00", tax: "0.00" },
				{ from: "5000000.00", upTo: null, rateBps: 3500, income: "0.00", tax: "0.00" },
			],
			marginalRateBps: 1000,
			toNextBracket: "100000.00",
			effectiveRateBps: 312,
		}
		expect(taxYear.parse(row)).toEqual(row)
		expect(taxYear.safeParse({ ...row, walk: { ...row.walk, extra: "1.00" } }).success).toBe(false)
		expect(taxYear.safeParse({ ...row, marginalRateBps: 10.5 }).success).toBe(false)
	})
})
