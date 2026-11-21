import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { NetWorth, Read } from "../../lib/contract"
import { failedRead, netWorth, okRead, row } from "../../lib/view/overview/fixtures.test-support"
import { NetWorthContent } from "./NetWorthContent"
import { argv, pageView, THB } from "./page-view.test-support"

const main = netWorth("2026-10-31", [row("Bank", "asset", "800.00")], THB("800.00"))
const headline = okRead(argv("2026-10-31"), main)

describe("NetWorthContent: the history", () => {
	test("folds the month-end table into details, and marks a month that could not be read", () => {
		const reads: Read<NetWorth>[] = [
			okRead(argv("2026-09-30"), netWorth("2026-09-30", [], THB("700.00"))),
			failedRead<NetWorth>(argv("2026-10-31")),
		]
		const html = renderToStaticMarkup(<NetWorthContent view={pageView(headline, reads)} />)
		expect(html).toContain("<details")
		expect(html).toContain("Net worth at each month-end")
		expect(html).toContain("30 Sep 2026")
		expect(html).toContain("Could not be read (LEDGER_EMPTY)")
		expect(html).toContain("1 could not be read and is left out.")
	})

	test("says how many month-end reads the history used", () => {
		const reads = [okRead(argv("2026-09-30"), netWorth("2026-09-30", [], THB("700.00")))]
		const html = renderToStaticMarkup(<NetWorthContent view={pageView(headline, reads)} />)
		expect(html).toContain("The history uses 1 month-end read, from Sep 2026 to Sep 2026.")
	})

	test("handles an empty history and an empty ledger", () => {
		const empty = netWorth("2026-10-31", [], [])
		const html = renderToStaticMarkup(
			<NetWorthContent view={pageView(okRead(argv("2026-10-31"), empty))} />,
		)
		expect(html).toContain("Nothing to chart yet")
		expect(html).toContain("The history has no month-end read to chart.")
		expect(html).toContain("No asset accounts.")
		expect(html).toContain("No liability accounts.")
		expect(html).toContain("No total")
	})
})
