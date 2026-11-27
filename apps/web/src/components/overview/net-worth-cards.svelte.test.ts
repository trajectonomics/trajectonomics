import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import type { NetWorth } from "../../lib/contract"
import { type NetWorthView, netWorthView } from "../../lib/view/net-worth/view"
import { failedRead, netWorth, okRead, row } from "../../lib/view/overview/fixtures.test-support"
import type { NetWorthCardView } from "../../lib/view/overview/view"
import AssetsCard from "./AssetsCard.svelte"
import NetWorthCard from "./NetWorthCard.svelte"

const NW_ARGV = ["report", "networth", "--as-of", "2026-10-31", "--json"]
const THB = (amount: string) => [{ currency: "THB", amount }]

function netWorthCardRead(
	rows = [row("Bank", "asset", "600.00"), row("Loan", "liability", "-200.00")],
) {
	const data = netWorth("2026-10-31", rows, THB("400.00"))
	return okRead(NW_ARGV, { ...netWorthView(data), sparkline: [1, 2, 3], fees: null })
}

describe("NetWorthCard", () => {
	test("shows the total as the figure, its As-of, a link to its page and its command", () => {
		const { body } = render(NetWorthCard, { props: { netWorth: netWorthCardRead() } })
		expect(body).toContain("400.00")
		expect(body).toContain("As of 31 Oct 2026")
		expect(body).toContain('href="/net-worth/"')
		expect(body).toContain("traj report networth --as-of 2026-10-31 --json")
	})

	test("says plainly when the As-of is before the first transaction", () => {
		const data = netWorth("2024-10-31", [], THB("0.00"), "2024-11-01", true)
		const read = okRead(NW_ARGV, { ...netWorthView(data), sparkline: [], fees: null })
		expect(render(NetWorthCard, { props: { netWorth: read } }).body).toContain("not a real reading")
	})

	test("shows only its own error when its Read failed, and keeps its title and link", () => {
		const read = failedRead<NetWorthCardView>(NW_ARGV)
		const { body } = render(NetWorthCard, { props: { netWorth: read } })
		expect(body).toContain('role="alert"')
		expect(body).toContain("Net worth could not be read")
		expect(body).toContain("LEDGER_EMPTY message")
		expect(body).toContain(">Net worth<")
		expect(body).toContain('href="/net-worth/"')
	})

	test("draws a sparkline only from two or more month-ends", () => {
		const data = netWorth("2026-10-31", [], THB("1.00"))
		const one = okRead(NW_ARGV, { ...netWorthView(data), sparkline: [1], fees: null })
		expect(render(NetWorthCard, { props: { netWorth: one } }).body).not.toContain("<svg")
	})
})

describe("AssetsCard", () => {
	test("says when there are no asset or liability accounts", () => {
		const data: NetWorth = netWorth("2026-10-31", [], [])
		const { body } = render(AssetsCard, {
			props: { assets: okRead(NW_ARGV, netWorthView(data)) },
		})
		expect(body).toContain("No asset accounts.")
		expect(body).toContain("No liability accounts.")
	})

	test("divides the assets as a bar and reads a negative liability as what you owe", () => {
		const { body } = render(AssetsCard, { props: { assets: netWorthCardRead() } })
		expect(body).toContain('aria-label="Assets by account, THB"')
		expect(body).toContain("Loan")
		expect(body).toContain("You owe")
		expect(body).toContain("200.00")
		expect(body).toContain('title="The ledger states −200.00 THB"')
		expect(body).not.toContain("as the ledger states them")
	})

	test("reads an overpaid liability as money owed to you, not as money you owe", () => {
		const data = netWorth(
			"2026-10-31",
			[row("Bank", "asset", "600.00"), row("Loan", "liability", "50.00")],
			THB("650.00"),
		)
		const { body } = render(AssetsCard, {
			props: { assets: okRead(NW_ARGV, netWorthView(data)) },
		})
		expect(body).toContain("Owed to you")
		expect(body).toContain("50.00")
		expect(body).not.toContain("You owe")
	})

	test("is a failed card on its own when its Read failed", () => {
		const { body } = render(AssetsCard, {
			props: { assets: failedRead<NetWorthView>(NW_ARGV) },
		})
		expect(body).toContain("Net worth could not be read")
		expect(body).toContain('href="/net-worth/"')
	})
})
