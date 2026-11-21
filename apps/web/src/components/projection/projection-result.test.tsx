import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import {
	projectionRunFixture,
	withMonthlyTable,
} from "../../lib/view/projection/fixtures.test-support"
import { ProjectionResult } from "./ProjectionResult"

const ARGV = ["projection", "run", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

describe("ProjectionResult", () => {
	test("states the closing net worth nominal and the real figure in As-of terms, dated", () => {
		const html = renderToStaticMarkup(<ProjectionResult run={projectionRunFixture()} argv={ARGV} />)
		expect(html).toContain("Closing net worth")
		expect(html).toContain("1,550,000.00")
		expect(html).toContain("Real net worth, in As-of terms")
		expect(html).toContain("1,420,000.00")
	})

	test("says the money runs out, with the unmet amount, when it does", () => {
		const html = renderToStaticMarkup(
			<ProjectionResult
				run={projectionRunFixture({ runsOut: { date: "2028-04-01", unmet: "70359.24" } })}
				argv={ARGV}
			/>,
		)
		expect(html).toContain('Runs out <span class="whitespace-nowrap">1 Apr 2028</span>,')
		expect(html).toContain("70,359.24")
		expect(html).toContain("unmet")
	})

	test("says the money does not run out before the horizon when it does not", () => {
		const html = renderToStaticMarkup(
			<ProjectionResult run={projectionRunFixture({ runsOut: null })} argv={ARGV} />,
		)
		expect(html).toContain("Does not run out before")
		expect(html).toContain('<span class="whitespace-nowrap">31 Dec 2028</span>')
	})

	test("marks the year the projection ended in part", () => {
		const html = renderToStaticMarkup(<ProjectionResult run={projectionRunFixture()} argv={ARGV} />)
		expect(html).toContain("Partial year")
	})

	test("leaves the monthly rows out when the projection ran without --monthly", () => {
		const html = renderToStaticMarkup(<ProjectionResult run={projectionRunFixture()} argv={ARGV} />)
		expect(html).not.toContain("Monthly rows")
	})

	test("puts the monthly rows in a disclosure when the projection carries them", () => {
		const html = renderToStaticMarkup(
			<ProjectionResult run={withMonthlyTable(projectionRunFixture())} argv={ARGV} />,
		)
		expect(html).toContain("<details")
		expect(html).toContain("Monthly rows (2)")
	})

	test("shows the statement: tax status, every note, the hashes in twelve characters, and the command", () => {
		const html = renderToStaticMarkup(<ProjectionResult run={projectionRunFixture()} argv={ARGV} />)
		expect(html).toContain("What this result says about itself")
		expect(html).toContain("Tax applied")
		expect(html).toContain("Tax is applied: the fixture levy.")
		expect(html).toContain("A note the CLI states, in its own order.")
		expect(html).toContain("0123456789ab")
		expect(html).toContain("fedcba987654")
		expect(html).toContain("No Overrides")
		expect(html).toContain("traj projection run --scenario base --as-of 2026-10-31 --json")
	})
})
