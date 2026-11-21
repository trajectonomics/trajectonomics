import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { NetWorth } from "../../lib/contract"
import { type NetWorthView, netWorthView } from "../../lib/view/net-worth/view"
import { failedRead, netWorth, okRead, row } from "../../lib/view/overview/fixtures.test-support"
import { AssetsCard } from "./AssetsCard"
import { NetWorthCard } from "./NetWorthCard"

const NW_ARGV = ["report", "networth", "--as-of", "2026-10-31", "--json"]
const THB = (amount: string) => [{ currency: "THB", amount }]

function netWorthCardRead(
	rows = [row("Bank", "asset", "600.00"), row("Loan", "liability", "-200.00")],
) {
	const data = netWorth("2026-10-31", rows, THB("400.00"))
	return okRead(NW_ARGV, { ...netWorthView(data), sparkline: [1, 2, 3] })
}

describe("NetWorthCard", () => {
	test("shows the total as the figure, its As-of, a link to its page and its command", () => {
		const html = renderToStaticMarkup(<NetWorthCard netWorth={netWorthCardRead()} />)
		expect(html).toContain("400.00")
		expect(html).toContain("As of 31 Oct 2026")
		expect(html).toContain('href="/net-worth/"')
		expect(html).toContain("traj report networth --as-of 2026-10-31 --json")
	})

	test("says plainly when the As-of is before the first transaction", () => {
		const data = netWorth("2024-10-31", [], THB("0.00"), "2024-11-01", true)
		const read = okRead(NW_ARGV, { ...netWorthView(data), sparkline: [] })
		expect(renderToStaticMarkup(<NetWorthCard netWorth={read} />)).toContain("not a real reading")
	})

	test("shows only its own error when its Read failed, and keeps its title and link", () => {
		const html = renderToStaticMarkup(
			<NetWorthCard netWorth={failedRead<NetWorthView & { sparkline: number[] }>(NW_ARGV)} />,
		)
		expect(html).toContain('role="alert"')
		expect(html).toContain("Net worth could not be read")
		expect(html).toContain("LEDGER_EMPTY message")
		expect(html).toContain("Net worth</h2>")
		expect(html).toContain('href="/net-worth/"')
	})

	test("draws a sparkline only from two or more month-ends", () => {
		const data = netWorth("2026-10-31", [], THB("1.00"))
		const one = okRead(NW_ARGV, { ...netWorthView(data), sparkline: [1] })
		expect(renderToStaticMarkup(<NetWorthCard netWorth={one} />)).not.toContain("<svg")
	})
})

describe("AssetsCard", () => {
	test("says when there are no asset or liability accounts", () => {
		const data: NetWorth = netWorth("2026-10-31", [], [])
		const html = renderToStaticMarkup(<AssetsCard assets={okRead(NW_ARGV, netWorthView(data))} />)
		expect(html).toContain("No asset accounts.")
		expect(html).toContain("No liability accounts.")
	})

	test("divides the assets as a bar and lists the liabilities with their negative amounts", () => {
		const html = renderToStaticMarkup(<AssetsCard assets={netWorthCardRead()} />)
		expect(html).toContain('aria-label="Assets by account, THB"')
		expect(html).toContain("Loan")
		expect(html).toContain("−200.00")
	})

	test("is a failed card on its own when its Read failed", () => {
		const html = renderToStaticMarkup(<AssetsCard assets={failedRead<NetWorthView>(NW_ARGV)} />)
		expect(html).toContain("Net worth could not be read")
		expect(html).toContain('href="/net-worth/"')
	})
})
