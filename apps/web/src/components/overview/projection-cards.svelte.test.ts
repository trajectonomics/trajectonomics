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
	test("shows the closing net worth nominal and in As-of terms, and that it does not run out", () => {
		const run = projectionRun({ annual: [annualRow("2060-12-31", "19756836.98", "7196252.23")] })
		const read = okRead(["projection"], projectionView(run))
		const { body } = render(ProjectionCard, {
			props: { scenario: { status: "ready", name: "base", read } },
		})
		expect(body).toContain("19,756,836.98")
		expect(body).toContain("Real, in As-of terms")
		expect(body).toContain("7,196,252.23")
		expect(body).toContain("Does not run out before 31 Dec 2060.")
	})

	test("states when it runs out, and when there are no annual rows", () => {
		const run = projectionRun({
			annual: [annualRow("2060-12-31", "1.00", "1.00")],
			runsOut: { date: "2056-05-01", unmet: "70359.24" },
		})
		const read = okRead(["projection"], projectionView(run))
		expect(
			render(ProjectionCard, { props: { scenario: { status: "ready", name: "base", read } } }).body,
		).toContain("Runs out on 1 May 2056")
		const empty = okRead(["projection"], projectionView(projectionRun({ annual: [] })))
		expect(
			render(ProjectionCard, {
				props: { scenario: { status: "ready", name: "base", read: empty } },
			}).body,
		).toContain("no annual rows")
	})
})

describe("TaxCard", () => {
	test("says the Scenario has no Levy when there are no rows", () => {
		const run = projectionRun({ tax: "not_applied", taxYears: [] })
		const read = okRead(["projection"], taxView(run))
		const { body } = render(TaxCard, {
			props: { scenario: { status: "ready", name: "base", read } },
		})
		expect(body).toContain("no Levy, so every figure is before tax")
		expect(body).toContain("Tax not applied")
	})

	test("shows what is owed, its period and its settlement date", () => {
		const run = projectionRun({ taxYears: [taxYear("2026-01-01", "2026-12-31", "89000.00")] })
		const read = okRead(["projection"], taxView(run))
		const { body } = render(TaxCard, {
			props: { scenario: { status: "ready", name: "base", read } },
		})
		expect(body).toContain("89,000.00")
		expect(body).toContain("1 Jan 2026 to 31 Dec 2026")
		expect(body).toContain("Settles 31 Mar 2027")
		expect(body).toContain("Tax applied")
	})
})
