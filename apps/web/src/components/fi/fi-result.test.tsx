import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { Fi } from "../../lib/contract"
import { bindingSentence } from "../../lib/view/fi/binding"
import { fiFixture, REACHABLE, UNREACHABLE } from "../../lib/view/fi/fixtures.test-support"
import { FiResult } from "./FiResult"

const ARGV = ["fi", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

function render(fi: Fi): string {
	return renderToStaticMarkup(<FiResult fi={fi} argv={ARGV} />)
}

describe("FiResult: reachable", () => {
	test("shows the FI month as the main figure, under the label Survival method", () => {
		const html = render(fiFixture(REACHABLE))
		expect(html).toContain("Survival method")
		expect(html).toContain("Mar 2041")
		expect(html).toContain("The earliest month earned income could stop: 1 Mar 2041")
	})

	test("labels the rule-of-thumb as a reference, not the answer, with its figures", () => {
		const html = render(fiFixture(REACHABLE))
		expect(html).toContain("Rule-of-thumb reference, not the answer")
		expect(html).toContain("25×")
		expect(html).toContain("Not met")
		expect(html).toContain("Full: the window holds twelve months")
		expect(html).toContain("1,250,000.00")
	})

	test("states the definition, the tax status and the command", () => {
		const html = render(fiFixture(REACHABLE))
		expect(html).toContain("Definition version")
		expect(html).toContain("survival")
		expect(html).toContain("Tax not applied")
		expect(html).toContain("traj fi --scenario base --as-of 2026-10-31 --json")
	})

	test("has no best case when the FI date is reachable", () => {
		expect(render(fiFixture(REACHABLE))).not.toContain("Best case")
	})
})

describe("FiResult: unreachable", () => {
	test("says the FI date is not reachable before the horizon, and what binds it", () => {
		const html = render(fiFixture(UNREACHABLE.insufficientMoney))
		expect(html).toContain("Not reachable before 31 Dec 2060")
		expect(html).toContain(bindingSentence("insufficientMoney"))
	})

	test("gives the run-out best case: the month, the day the money runs out, the unmet amount", () => {
		const html = render(fiFixture(UNREACHABLE.insufficientMoney))
		expect(html).toContain("Best case")
		expect(html).toContain("If earned income stopped in Mar 2030:")
		expect(html).toContain("the money runs out on 1 Aug 2031, with")
		expect(html).toContain("900.00")
	})

	test("gives the buffer-breach best case: the breach day, required against accessible", () => {
		const html = render(fiFixture(UNREACHABLE.minimumBuffer))
		expect(html).toContain("If earned income stopped in Apr 2030:")
		expect(html).toContain("falls short of the buffer on 1 Sep 2030: required")
		expect(html).toContain("300,000.00")
		expect(html).toContain("250,000.00")
	})

	test("reads no best case when no month could start a stop", () => {
		const html = render(fiFixture(UNREACHABLE.noCandidateMonth))
		expect(html).toContain(bindingSentence("noCandidateMonth"))
		expect(html).not.toContain("Best case")
	})

	test("points to the Tax page when the Scenario has tax years", () => {
		const taxYear = {
			levy: "fixture-levy",
			from: "2026-01-01",
			to: "2026-12-31",
			settlementDate: "2027-03-31",
			due: "89000.00",
			prepaid: "0.00",
			owed: "89000.00",
			settled: true,
			partial: false,
		}
		const html = render(fiFixture(UNREACHABLE.minimumBuffer, { taxYears: [taxYear] }))
		expect(html).toContain('href="/tax/"')
		expect(html).toContain("See them on the Tax page")
	})

	test("has no pointer to the Tax page when there are no tax years", () => {
		expect(render(fiFixture(REACHABLE))).not.toContain("/tax/")
	})
})
