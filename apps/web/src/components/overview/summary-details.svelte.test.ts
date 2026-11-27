import { afterAll, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import { GOLDEN_ALLOWANCES } from "../../lib/view/allowances/fixtures.test-support"
import { allowancesSummaryOf } from "../../lib/view/allowances/home"
import { chanceFixture } from "../../lib/view/chance/fixtures.test-support"
import { chanceSummaryOf } from "../../lib/view/chance/page"
import { netWorthView } from "../../lib/view/net-worth/view"
import { netWorth, okRead, row } from "../../lib/view/overview/fixtures.test-support"
import { projectionView } from "../../lib/view/overview/projection"
import {
	annualRow,
	projectionRun,
	taxYear,
} from "../../lib/view/overview/projection-fixtures.test-support"
import { taxView } from "../../lib/view/overview/tax"
import { overviewView } from "../../lib/view/overview/view"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import AccountsCard from "./AccountsCard.svelte"
import AllowancesCard from "./AllowancesCard.svelte"
import ChanceCard from "./ChanceCard.svelte"
import EstateCard from "./EstateCard.svelte"
import NetWorthCard from "./NetWorthCard.svelte"
import OverviewGrid from "./OverviewGrid.svelte"
import ProjectionCard from "./ProjectionCard.svelte"
import TaxCard from "./TaxCard.svelte"
import WithdrawalsCard from "./WithdrawalsCard.svelte"

afterAll(() => {
	preferences.hidden = false
})

/** The card's Details, where every exact figure and CLI note lives. */
function detailsOf(body: string): string {
	const start = body.indexOf("<details")
	const end = body.indexOf("</details>")
	return start < 0 || end < 0 ? "" : body.slice(start, end)
}

/** Renders a card with amounts hidden, then puts the switch back. */
function hidden(body: () => string): string {
	preferences.hidden = true
	try {
		return detailsOf(body())
	} finally {
		preferences.hidden = false
	}
}

const NW_ARGV = ["report", "networth", "--as-of", "2026-10-31", "--json"]
const THB = (amount: string) => [{ currency: "THB", amount }]
const NET_WORTH = okRead(
	NW_ARGV,
	netWorthView(
		netWorth(
			"2026-10-31",
			[row("Bank", "asset", "600.00"), row("Loan", "liability", "-200.00")],
			THB("400.00"),
		),
	),
)

describe("every summary card keeps its exact figures in Details", () => {
	test("Net worth holds the total at the CLI's exact figure, and masks it", () => {
		const body = render(NetWorthCard, { props: { netWorth: NET_WORTH } }).body
		expect(detailsOf(body)).toContain("400.00")
		const hiddenBody = hidden(() => render(NetWorthCard, { props: { netWorth: NET_WORTH } }).body)
		expect(hiddenBody).toContain("•••••")
		expect(hiddenBody).not.toContain("400.00")
	})

	test("At the end holds the nominal and today's-money figures, and masks them", () => {
		const run = projectionRun({
			annual: [annualRow("2060-12-31", "19756836.98", "7196252.23")],
		})
		const props = {
			scenario: {
				status: "ready" as const,
				name: "base",
				read: okRead(["projection"], projectionView(run)),
			},
		}
		const body = render(ProjectionCard, { props }).body
		expect(detailsOf(body)).toContain("19,756,836.98")
		expect(detailsOf(body)).toContain("7,196,252.23")
		const hiddenBody = hidden(() => render(ProjectionCard, { props }).body)
		expect(hiddenBody).toContain("•••••")
		expect(hiddenBody).not.toContain("19,756,836.98")
	})

	test("Chance holds the exact share and counts, which are not amounts", () => {
		const read = okRead(["projection", "chance"], chanceSummaryOf(chanceFixture()))
		const props = { scenario: { status: "ready" as const, name: "base", read } }
		const body = render(ChanceCard, { props }).body
		expect(detailsOf(body)).toContain("87%")
		expect(detailsOf(body)).toContain("174 of 200")
		preferences.hidden = true
		try {
			expect(detailsOf(render(ChanceCard, { props }).body)).toContain("87%")
		} finally {
			preferences.hidden = false
		}
	})

	test("Tax holds the exact tax and the tax rules id, and masks the figure", () => {
		const run = projectionRun({ taxYears: [taxYear("2026-01-01", "2026-12-31", "89000.00")] })
		const read = okRead(["projection"], taxView(run))
		const props = { scenario: { status: "ready" as const, name: "base", read } }
		const body = render(TaxCard, { props }).body
		expect(detailsOf(body)).toContain("89,000.00")
		expect(detailsOf(body)).toContain("th-2026-pit")
		const hiddenBody = hidden(() => render(TaxCard, { props }).body)
		expect(hiddenBody).toContain("•••••")
		expect(hiddenBody).not.toContain("89,000.00")
	})

	test("Accounts holds every account's exact figure, the loan too, and masks them", () => {
		const body = render(AccountsCard, { props: { netWorth: NET_WORTH } }).body
		expect(detailsOf(body)).toContain("600.00")
		expect(detailsOf(body)).toContain("−200.00")
		const hiddenBody = hidden(() => render(AccountsCard, { props: { netWorth: NET_WORTH } }).body)
		expect(hiddenBody).toContain("•••••")
		expect(hiddenBody).not.toContain("600.00")
		expect(hiddenBody).not.toContain("200.00")
	})

	test("Tax you could save holds the exact saving, and masks it", () => {
		const summary = allowancesSummaryOf(GOLDEN_ALLOWANCES)
		const props = {
			scenario: {
				status: "ready" as const,
				name: "base",
				read: { argv: ["projection", "allowances"], ok: true as const, data: summary },
			},
		}
		const body = render(AllowancesCard, { props }).body
		expect(detailsOf(body)).toContain("28,100.00")
		const hiddenBody = hidden(() => render(AllowancesCard, { props }).body)
		expect(hiddenBody).toContain("•••••")
		expect(hiddenBody).not.toContain("28,100.00")
	})

	test("Spending in retirement holds the exact amount, and masks it", () => {
		const view = overviewView(DEMO)
		const body = render(WithdrawalsCard, { props: { scenario: view.withdrawals } }).body
		expect(detailsOf(body)).toContain("862,256.24")
		const hiddenBody = hidden(
			() => render(WithdrawalsCard, { props: { scenario: view.withdrawals } }).body,
		)
		expect(hiddenBody).toContain("•••••")
		expect(hiddenBody).not.toContain("862,256.24")
	})

	test("Your heirs would receive holds the exact figure, and masks it", () => {
		const view = overviewView(DEMO)
		const body = render(EstateCard, { props: { scenario: view.estate } }).body
		expect(detailsOf(body)).toContain("15,671,500.52")
		const hiddenBody = hidden(() => render(EstateCard, { props: { scenario: view.estate } }).body)
		expect(hiddenBody).toContain("•••••")
		expect(hiddenBody).not.toContain("15,671,500.52")
	})
})

describe("the summary grid's headings", () => {
	test("are h3 under the section's h2", () => {
		const body = render(OverviewGrid, { props: { view: overviewView(DEMO) } }).body
		expect(body.match(/<h3/g)).toHaveLength(8)
		expect(body.match(/<h2/g)).toHaveLength(1)
	})
})
