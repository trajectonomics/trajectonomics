import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import type { Fi } from "../../lib/contract"
import { insideDetails, outsideDetails } from "../../lib/view/details.test-support"
import { bindingSentence } from "../../lib/view/fi/binding"
import { fiFixture, REACHABLE, UNREACHABLE } from "../../lib/view/fi/fixtures.test-support"
import FiResult from "./FiResult.svelte"

const ARGV = ["fi", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

function renderFi(fi: Fi): string {
	return render(FiResult, { props: { fi, argv: ARGV } }).body
}

describe("FiResult: reachable", () => {
	test("shows the FI month as the main figure, under the label FI date", () => {
		const body = renderFi(fiFixture(REACHABLE))
		expect(body).toContain(">FI date<")
		expect(body).not.toContain("Survival method")
		expect(body).toContain("Mar 2041")
		expect(body).toContain("The earliest month earned income could stop: 1 Mar 2041")
	})

	test("states each person's age on the FI date, and no line without a household", () => {
		const ages = [
			{ person: "me", age: 51 },
			{ person: "partner", age: 49 },
		]
		const reachable = fiFixture(REACHABLE)
		if (!reachable.fi.reachable) throw new Error("expected a reachable answer")
		const body = renderFi({ ...reachable, fi: { ...reachable.fi, ages } })
		expect(body).toContain("Ages on that date: me 51, partner 49.")
		expect(renderFi(reachable)).not.toContain("Ages on that date")
	})

	test("labels the rule-of-thumb as a reference, not the answer, with its figures", () => {
		const body = renderFi(fiFixture(REACHABLE))
		expect(body).toContain("Rule-of-thumb reference, not the answer")
		expect(body).toContain("25×")
		expect(body).toContain("Not met")
		expect(body).toContain("Full: the window holds twelve months")
		expect(body).toContain("1,250,000.00")
	})

	test("states the definition and tax status at full weight, and the command, hashes and raw measures in Details", () => {
		const body = renderFi(fiFixture(REACHABLE))
		const outside = outsideDetails(body)
		const details = insideDetails(body)
		expect(outside).toContain("Tax not applied")
		expect(outside).not.toContain("Method")
		expect(outside).not.toContain(">survival<")
		expect(outside).not.toContain("Content hash")
		expect(outside).not.toContain("Definition version")
		expect(outside).not.toContain("basis points")
		expect(details).toContain("traj fi --scenario base --as-of 2026-10-31 --json")
		expect(details).toContain("Content hash")
		expect(details).toContain("0123456789ab")
		expect(details).toContain("Effective hash, after Overrides")
		expect(details).toContain("Definition version")
		expect(details).toContain("survival")
		expect(details).toContain("Numerator")
		expect(details).toContain("200000 basis points, where 10,000 is one times")
	})

	test("shows the multiple in words at full weight, with the CLI's reference value", () => {
		const body = renderFi(fiFixture(REACHABLE))
		expect(outsideDetails(body)).toContain("20.0× a year of spending (reference: 25×)")
		expect(outsideDetails(body)).not.toContain("200000 basis points")
	})

	test("has no best case when the FI date is reachable", () => {
		expect(renderFi(fiFixture(REACHABLE))).not.toContain("Best case")
	})
})

describe("FiResult: unreachable", () => {
	test("says the FI date is not reachable before the horizon, and what binds it", () => {
		const body = renderFi(fiFixture(UNREACHABLE.insufficientMoney))
		expect(body).toContain("Not reachable before 31 Dec 2060")
		expect(body).toContain(bindingSentence("insufficientMoney"))
	})

	test("gives the run-out best case: the month, the day the money runs out, the unmet amount", () => {
		const body = renderFi(fiFixture(UNREACHABLE.insufficientMoney))
		expect(body).toContain("Best case")
		expect(body).toContain("If earned income stopped in Mar 2030:")
		expect(body).toContain("the money runs out on 1 Aug 2031, with")
		expect(body).toContain("900.00")
	})

	test("gives the buffer-breach best case: the breach day, required against accessible", () => {
		const body = renderFi(fiFixture(UNREACHABLE.minimumBuffer))
		expect(body).toContain("If earned income stopped in Apr 2030:")
		expect(body).toContain("falls short of the buffer on 1 Sep 2030: required")
		expect(body).toContain("300,000.00")
		expect(body).toContain("250,000.00")
	})

	test("reads no best case when no month could start a stop", () => {
		const body = renderFi(fiFixture(UNREACHABLE.noCandidateMonth))
		expect(body).toContain(bindingSentence("noCandidateMonth"))
		expect(body).not.toContain("Best case")
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
			assumptions: [],
		}
		const body = renderFi(fiFixture(UNREACHABLE.minimumBuffer, { taxYears: [taxYear] }))
		expect(body).toContain('href="/tax/"')
		expect(body).toContain("See them on the Tax page")
	})

	test("has no pointer to the Tax page when there are no tax years", () => {
		expect(renderFi(fiFixture(REACHABLE))).not.toContain("/tax/")
	})
})
