import { describe, expect, test } from "bun:test"
import { ANNUAL_ROWS, projectionRunFixture } from "./fixtures.test-support"
import { headlineOf } from "./headline"

describe("headlineOf", () => {
	const last = ANNUAL_ROWS[ANNUAL_ROWS.length - 1]

	test("takes the closing net worth of the last annual row, nominal, with its date", () => {
		const headline = headlineOf(projectionRunFixture())
		expect(headline?.closing).toEqual({ amount: last?.closingNetWorth ?? "", date: last?.to ?? "" })
	})

	test("takes the real net worth of that same row, dated where the CLI measured it", () => {
		const headline = headlineOf(projectionRunFixture())
		expect(headline?.real).toEqual({
			amount: last?.realNetWorth.amount ?? "",
			date: last?.realNetWorth.date ?? "",
		})
	})

	test("reports no run-out when the money does not run out before the horizon", () => {
		const headline = headlineOf(projectionRunFixture({ runsOut: null }))
		expect(headline?.runsOut).toBeNull()
		expect(headline?.horizonYear).toBe("2028")
	})

	test("reports the run-out date and the unmet amount exactly as the CLI states them", () => {
		const runsOut = { date: "2028-04-01", unmet: "70359.24" }
		const headline = headlineOf(projectionRunFixture({ runsOut }))
		expect(headline?.runsOut).toEqual(runsOut)
	})

	test("has no headline when the projection has no annual row to read", () => {
		expect(headlineOf(projectionRunFixture({ tables: [] }))).toBeNull()
	})
})
