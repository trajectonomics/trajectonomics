import { describe, expect, test } from "bun:test"
import { ANNUAL_ROWS, projectionRunFixture } from "./fixtures.test-support"
import { headlineOf } from "./headline"

describe("headlineOf", () => {
	const last = ANNUAL_ROWS[ANNUAL_ROWS.length - 1]

	test("takes the closing net worth of the last annual row, nominal, with its date and the horizon year", () => {
		const headline = headlineOf(projectionRunFixture())
		expect(headline?.closing).toEqual({ amount: last?.closingNetWorth ?? "", date: last?.to ?? "" })
		expect(headline?.horizonYear).toBe("2028")
	})

	test("has no headline when the projection has no annual row to read", () => {
		expect(headlineOf(projectionRunFixture({ tables: [] }))).toBeNull()
	})
})
