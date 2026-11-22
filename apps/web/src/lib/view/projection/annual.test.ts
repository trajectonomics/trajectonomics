import { describe, expect, test } from "bun:test"
import { annualRowsOf, monthlyRowsOf } from "./annual"
import {
	ANNUAL_ROWS,
	MONTHLY_ROWS,
	projectionRunFixture,
	withMonthlyTable,
} from "./fixtures.test-support"

describe("annualRowsOf", () => {
	test("returns the annual rows in the order the CLI stated them", () => {
		expect(annualRowsOf(projectionRunFixture()).map((row) => row.index)).toEqual([0, 1, 2])
	})

	test("returns no rows when the annual table is absent", () => {
		expect(annualRowsOf(projectionRunFixture({ tables: [] }))).toEqual([])
	})
})

describe("monthlyRowsOf", () => {
	test("has no monthly rows for a projection run without --monthly", () => {
		expect(monthlyRowsOf(projectionRunFixture())).toBeNull()
	})

	test("carries the monthly rows of a projection run with --monthly, beside the annual ones", () => {
		const run = withMonthlyTable(projectionRunFixture())
		expect(monthlyRowsOf(run)).toEqual(MONTHLY_ROWS)
		expect(annualRowsOf(run)).toEqual(ANNUAL_ROWS)
	})
})
