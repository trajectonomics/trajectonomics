import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import {
	projectionRunFixture,
	withMonthlyTable,
} from "../../lib/view/projection/fixtures.test-support"
import ProjectionResult from "./ProjectionResult.svelte"

const ARGV = ["projection", "run", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

function renderResult(run: ReturnType<typeof projectionRunFixture>): string {
	return render(ProjectionResult, { props: { run, argv: ARGV } }).body
}

describe("ProjectionResult, the year tables", () => {
	test("shows the annual table with every figure the CLI states, exact", () => {
		const body = renderResult(projectionRunFixture())
		expect(body).toContain("Opening net worth")
		expect(body).toContain("1,250,000.00")
		expect(body).toContain("1,550,000.00")
		expect(body).toContain("1,420,000.00")
	})

	test("marks the year the projection ended in part", () => {
		expect(renderResult(projectionRunFixture())).toContain("Partial year")
	})

	test("leaves the monthly rows out when the projection ran without --monthly", () => {
		expect(renderResult(projectionRunFixture())).not.toContain("Monthly rows")
	})

	test("puts the monthly rows in a disclosure when the projection carries them", () => {
		const body = renderResult(withMonthlyTable(projectionRunFixture()))
		expect(body).toContain("<details")
		expect(body).toContain("Monthly rows (2)")
	})

	test("shows the statement: tax status, every note, the hashes in twelve characters, and the command", () => {
		const body = renderResult(projectionRunFixture())
		expect(body).toContain("What this result says about itself")
		expect(body).toContain("Tax applied")
		expect(body).toContain("Tax is applied: the fixture levy.")
		expect(body).toContain("A note the CLI states, in its own order.")
		expect(body).toContain("0123456789ab")
		expect(body).toContain("fedcba987654")
		expect(body).toContain("No Overrides")
		expect(body).toContain("traj projection run --scenario base --as-of 2026-10-31 --json")
	})
})

describe("the annual table's Ages column", () => {
	test("shows each person's age on the row, from the CLI's ages", () => {
		const run = projectionRunFixture()
		const withAges = {
			...run,
			tables: run.tables.map((table) =>
				table.name === "annual"
					? {
							...table,
							rows: table.rows.map((row) => ({
								...row,
								ages: [
									{ person: "me", age: 60 },
									{ person: "partner", age: 58 },
								],
							})),
						}
					: table,
			),
		}
		const body = renderResult(withAges)
		expect(body).toContain("Ages")
		expect(body).toContain("me 60, partner 58")
	})

	test("shows a dash on each row when the plan has no household", () => {
		const body = renderResult(projectionRunFixture())
		expect(body).toContain("Ages")
		expect(body).toContain("—")
	})
})
