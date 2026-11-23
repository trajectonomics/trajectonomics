import { describe, expect, it } from "bun:test"
import { liabilityBlocks } from "./liabilities-human"

/** A result carrying only the two liability tables. */
function result(paid: Record<string, unknown>[], months: Record<string, unknown>[]) {
	return {
		tables: [
			{ name: "paidOff", count: paid.length, rows: paid },
			{ name: "liabilities", count: months.length, rows: months },
		],
	}
}

const month = (account: string, to: string, closing: string) => ({
	account,
	from: to,
	to,
	opening: "0.00",
	drawn: "0.00",
	interest: "0.00",
	paid: "0.00",
	closing,
	partial: false,
})

describe("the line each loan gets", () => {
	it("says paid off when the last month closes at zero", () => {
		const out = liabilityBlocks(
			result([{ account: "car", date: "2026-09-01" }], [month("car", "2027-03-30", "0.00")]),
		)
		expect(out[0]).toBe("car: paid off on 2026-09-01")
	})

	it("says it owes again when the loan was borrowed against after it was paid off", () => {
		const out = liabilityBlocks(
			result([{ account: "car", date: "2026-09-01" }], [month("car", "2027-03-30", "997.34")]),
		)
		expect(out[0]).toBe("car: paid off on 2026-09-01, then owes 997.34 at 2027-03-30 again")
	})

	it("says what it owes at the end when it was never paid off", () => {
		const out = liabilityBlocks(
			result([{ account: "car", date: null }], [month("car", "2027-03-30", "20938.79")]),
		)
		expect(out[0]).toBe("car: owes 20938.79 at 2027-03-30")
	})
})
