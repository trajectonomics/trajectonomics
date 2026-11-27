import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import { okRead } from "../../lib/view/overview/fixtures.test-support"
import { projectionView } from "../../lib/view/overview/projection"
import {
	annualRow,
	projectionRun,
	taxYear,
} from "../../lib/view/overview/projection-fixtures.test-support"
import { taxView } from "../../lib/view/overview/tax"
import ProjectionCard from "./ProjectionCard.svelte"
import TaxCard from "./TaxCard.svelte"

describe("ProjectionCard", () => {
	test("names the last year, and shows the closing net worth with its today's-money figure", () => {
		const run = projectionRun({ annual: [annualRow("2060-12-31", "19756836.98", "7196252.23")] })
		const read = okRead(["projection"], projectionView(run))
		const { body } = render(ProjectionCard, {
			props: { scenario: { status: "ready", name: "base", read } },
		})
		expect(body).toContain("At the end, 2060")
		expect(body).toContain("19.7M")
		expect(body).toContain("7.19M")
		expect(body).toContain("in today's money")
		expect(body).toContain('title="19,756,836.98"')
		expect(body).toContain('title="7,196,252.23"')
		expect(body).not.toContain("Money lasts to the end of the plan")
	})

	test("says when there are no annual rows, and still links to the Plan", () => {
		const empty = okRead(["projection"], projectionView(projectionRun({ annual: [] })))
		const { body } = render(ProjectionCard, {
			props: { scenario: { status: "ready", name: "base", read: empty } },
		})
		expect(body).toContain("At the end")
		expect(body).toContain("no annual rows")
		expect(body).toContain('href="/projection/"')
	})
})

describe("TaxCard", () => {
	test("says the plan has no tax rules when there are no rows", () => {
		const run = projectionRun({ tax: "not_applied", taxYears: [] })
		const read = okRead(["projection"], taxView(run))
		const { body } = render(TaxCard, {
			props: { scenario: { status: "ready", name: "base", read } },
		})
		expect(body).toContain("no tax rules, so every figure is before tax")
		expect(body).toContain(">Tax<")
	})

	test("names the year, shortens the figure, and says when it is due", () => {
		const run = projectionRun({ taxYears: [taxYear("2026-01-01", "2026-12-31", "89000.00")] })
		const read = okRead(["projection"], taxView(run))
		const { body } = render(TaxCard, {
			props: { scenario: { status: "ready", name: "base", read } },
		})
		expect(body).toContain("Tax for 2026")
		expect(body).toContain("89k")
		expect(body).toContain('title="89,000.00"')
		expect(body).toContain("Due 31 Mar 2027")
		expect(body).toContain('href="/tax/"')
	})
})
