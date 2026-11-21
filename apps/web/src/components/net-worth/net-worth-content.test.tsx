import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import { failedRead, netWorth, okRead, row } from "../../lib/view/overview/fixtures.test-support"
import { NetWorthContent } from "./NetWorthContent"
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
		const html = renderToStaticMarkup(
			<NetWorthContent view={pageView(okRead(argv("2026-10-31"), main))} />,
		)
		expect(html).toContain("800.00")
		expect(html).toContain("As of 31 Oct 2026")
		expect(html).toContain("traj report networth --as-of 2026-10-31 --json")
	})

	test("says plainly that the As-of is before the first transaction", () => {
		const before = netWorth("2024-10-31", [], THB("0.00"), "2024-11-01", true)
		const html = renderToStaticMarkup(
			<NetWorthContent view={pageView(okRead(argv("2024-10-31"), before))} />,
		)
		expect(html).toContain(
			"is before the first transaction on 1 Nov 2024, so the zero is not a real reading.",
		)
	})

	test("divides the assets by account and lists the liabilities as the CLI states them", () => {
		const html = renderToStaticMarkup(
			<NetWorthContent view={pageView(okRead(argv("2026-10-31"), main))} />,
		)
		expect(html).toContain('aria-label="Assets by account, THB"')
		expect(html).toContain("−200.00")
		expect(html).toContain("Liabilities, shown negative as the ledger states them")
	})

	test("gives every row of the report in a table with its account, type and amount", () => {
		const html = renderToStaticMarkup(
			<NetWorthContent view={pageView(okRead(argv("2026-10-31"), main))} />,
		)
		expect(html).toContain("Every account in net worth")
		for (const heading of ["Account", "Type", "Amount"]) expect(html).toContain(`>${heading}<`)
		expect(html).toContain("Liability")
		expect(html).toContain("Fund")
	})

	test("shows the CLI's error alone when the net worth Read failed", () => {
		const html = renderToStaticMarkup(
			<NetWorthContent view={pageView(failedRead(argv("2026-10-31")))} />,
		)
		expect(html).toContain('role="alert"')
		expect(html).toContain("Net worth could not be read")
		expect(html).not.toContain("Every account in net worth")
	})
})
