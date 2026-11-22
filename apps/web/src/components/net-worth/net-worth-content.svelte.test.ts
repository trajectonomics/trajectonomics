import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { NetWorth, Read } from "../../lib/contract"
import { failedRead, netWorth, okRead, row } from "../../lib/view/overview/fixtures.test-support"
import NetWorthContent from "./NetWorthContent.svelte"
import { argv, pageView, THB } from "./page-view.test-support"

const main = netWorth(
	"2026-10-31",
	[
		row("Bank", "asset", "600.00"),
		row("Fund", "asset", "400.00"),
		row("Loan", "liability", "-200.00"),
	],
	THB("800.00"),
)

describe("NetWorthContent: the headline and the composition", () => {
	test("shows the headline with its As-of, and the command that produced it", () => {
		const { body } = render(NetWorthContent, {
			props: { view: pageView(okRead(argv("2026-10-31"), main)) },
		})
		expect(body).toContain("800.00")
		expect(body).toContain("As of 31 Oct 2026")
		expect(body).toContain("traj report networth --as-of 2026-10-31 --json")
	})

	test("says plainly that the As-of is before the first transaction", () => {
		const before = netWorth("2024-10-31", [], THB("0.00"), "2024-11-01", true)
		const { body } = render(NetWorthContent, {
			props: { view: pageView(okRead(argv("2024-10-31"), before)) },
		})
		expect(body).toContain(
			"is before the first transaction on 1 Nov 2024, so the zero is not a real reading.",
		)
	})

	test("divides the assets by account and lists the liabilities as the CLI states them", () => {
		const { body } = render(NetWorthContent, {
			props: { view: pageView(okRead(argv("2026-10-31"), main)) },
		})
		expect(body).toContain('aria-label="Assets by account, THB"')
		expect(body).toContain("−200.00")
		expect(body).toContain("Liabilities, shown negative as the ledger states them")
	})

	test("gives every row of the report in a table with its account, type and amount", () => {
		const { body } = render(NetWorthContent, {
			props: { view: pageView(okRead(argv("2026-10-31"), main)) },
		})
		expect(body).toContain("Every account in net worth")
		for (const heading of ["Account", "Type", "Amount"]) expect(body).toContain(`>${heading}<`)
		expect(body).toContain("Liability")
		expect(body).toContain("Fund")
	})

	test("shows the CLI's error alone when the net worth Read failed", () => {
		const { body } = render(NetWorthContent, {
			props: { view: pageView(failedRead(argv("2026-10-31"))) },
		})
		expect(body).toContain('role="alert"')
		expect(body).toContain("Net worth could not be read")
		expect(body).not.toContain("Every account in net worth")
	})
})

describe("NetWorthContent: the history", () => {
	const headline = okRead(argv("2026-10-31"), main)

	test("folds the month-end table into details, and marks a month that could not be read", () => {
		const reads: Read<NetWorth>[] = [
			okRead(argv("2026-09-30"), netWorth("2026-09-30", [], THB("700.00"))),
			failedRead<NetWorth>(argv("2026-10-31")),
		]
		const { body } = render(NetWorthContent, { props: { view: pageView(headline, reads) } })
		expect(body).toContain("<details")
		expect(body).toContain("Net worth at each month-end")
		expect(body).toContain("30 Sep 2026")
		expect(body).toContain("Could not be read (LEDGER_EMPTY)")
		expect(body).toContain("1 could not be read and is left out.")
	})

	test("says how many month-end reads the history used", () => {
		const reads: Read<NetWorth>[] = [
			okRead(argv("2026-09-30"), netWorth("2026-09-30", [], THB("700.00"))),
		]
		const { body } = render(NetWorthContent, { props: { view: pageView(headline, reads) } })
		expect(body).toContain("The history uses 1 month-end read, from Sep 2026 to Sep 2026.")
	})

	test("handles an empty history and an empty ledger", () => {
		const empty = netWorth("2026-10-31", [], [])
		const { body } = render(NetWorthContent, {
			props: { view: pageView(okRead(argv("2026-10-31"), empty)) },
		})
		expect(body).toContain("Nothing to chart yet")
		expect(body).toContain("The history has no month-end read to chart.")
		expect(body).toContain("No asset accounts.")
		expect(body).toContain("No liability accounts.")
		expect(body).toContain("No total")
	})
})
