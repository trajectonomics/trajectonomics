import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { type ProjectionRun, scenarioDocument } from "../../lib/contract"
import { baselineRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { accountItems } from "../../lib/view/what-if/plan-items"
import AccountCards from "./AccountCards.svelte"

const PAYOUT = {
	bps: "3.50",
	frequency: "quarterly",
	rounding: "floor",
	startAt: "retire",
	label: "income.section40_4.dividends",
}
const FEE = { bps: "1.00", rounding: "halfUp" }
const PLAIN = { id: "fund", kind: "asset", rate: 600 }

const docWith = (extra: Record<string, unknown>) => {
	const base = planDocument()
	return scenarioDocument.parse({ ...base, accounts: [...base.accounts, { ...PLAIN, ...extra }] })
}
const runOf = (lifetimeFees?: string, lifetimePayouts?: string) =>
	({
		accountLifetimes: [{ account: "fund", lifetimeFees, lifetimePayouts }],
		tables: [],
	}) as unknown as ProjectionRun

/** The fund's card as the page draws it, with the what-if replacing the fund by `tried` (or leaving it when undefined). */
function fundCard(
	stored: Record<string, unknown>,
	tried: Record<string, unknown> | undefined,
	runs: { run?: ProjectionRun; tried?: ProjectionRun } = {},
): string {
	const sets = tried === undefined ? [] : [{ path: "accounts.fund", value: { ...PLAIN, ...tried } }]
	const view = accountItems(docWith(stored), baselineRead(), { sets, removals: [] }, runs)
	const card = view.cards.find((one) => one.id === "fund")
	return render(AccountCards, {
		props: {
			cards: card === undefined ? [] : [card],
			marks: view.marks,
			currency: "THB",
			editable: false,
			onEdit: () => {},
			plan: "plan",
			contentHash: "h",
			onTry: () => {},
		},
	}).body
}

const struck = (text: string) => new RegExp(`<s class[^>]*>(?:(?!</s>).)*${text}(?:(?!</s>).)*</s>`)

describe("a What-if that removes an Account's fee", () => {
	const body = fundCard({ fee: FEE }, {}, { run: runOf("203804.22"), tried: runOf() })

	test("keeps the Fee row, saying none and striking the baseline's fee", () => {
		expect(body).toMatch(/Fee<\/dt>\s*<dd>none/)
		expect(body).toMatch(struck("Fee 1% a year"))
	})

	test("keeps 'Fees over the plan', saying None and striking the baseline's figure", () => {
		expect(body).toMatch(/Fees over the plan<\/dt>\s*<dd>(?:<!--[^>]*-->)*None/)
		expect(body).toMatch(struck("203,804.22"))
	})
})

describe("a What-if that removes an Account's payout", () => {
	const body = fundCard(
		{ payout: PAYOUT },
		{},
		{ run: runOf(undefined, "4051.89"), tried: runOf() },
	)

	test("keeps the Payout row, saying none and striking the baseline's payout", () => {
		expect(body).toMatch(/Payout<\/dt>\s*<dd>none/)
		expect(body).toMatch(struck("Pays out 3.5% a year"))
	})

	test("strikes the baseline's how-line, so 'Paid quarterly' is not lost", () => {
		expect(body).toMatch(struck("Paid quarterly"))
	})

	test("keeps 'Paid out over the plan', saying None and striking the baseline's figure", () => {
		expect(body).toMatch(/Paid out over the plan<\/dt>\s*<dd>(?:<!--[^>]*-->)*None/)
		expect(body).toMatch(struck("4,051.89"))
	})
})

describe("a What-if that adds a fee or a payout", () => {
	test("strikes a 'none' beside the new fee and its total", () => {
		const body = fundCard({}, { fee: FEE }, { run: runOf(), tried: runOf("20.00") })
		expect(body).toContain("Fee 1% a year")
		expect(body).toMatch(struck("none"))
		expect(body).toContain("Fees over the plan")
	})

	test("strikes a 'none' beside the new payout and its total", () => {
		const body = fundCard({}, { payout: PAYOUT }, { run: runOf(), tried: runOf(undefined, "9.00") })
		expect(body).toContain("Pays out 3.5% a year")
		expect(body).toMatch(struck("none"))
		expect(body).toContain("Paid out over the plan")
	})
})

describe("a What-if that changes only how a payout is paid", () => {
	test("strikes the baseline's how-line and leaves the payout's own words alone", () => {
		const body = fundCard({ payout: PAYOUT }, { payout: { ...PAYOUT, frequency: "monthly" } })
		expect(body).toContain("Paid monthly")
		expect(body).toMatch(struck("Paid quarterly"))
		expect(body).not.toMatch(struck("Pays out"))
	})
})

describe("a card whose Account has neither a fee nor a payout, before and after", () => {
	test("shows no Fee, Payout or total row", () => {
		const body = fundCard({}, { rate: 700 }, { run: runOf(), tried: runOf() })
		expect(body).not.toContain("Fee</dt>")
		expect(body).not.toContain("Payout</dt>")
		expect(body).not.toContain("over the plan")
	})
})

describe("a card whose Account keeps its fee and payout", () => {
	const kept = { fee: FEE, payout: PAYOUT }
	const run = runOf("9.00", "4.00")
	const body = fundCard(kept, { ...kept, rate: 700 }, { run, tried: run })

	test("shows the rows and strikes nothing for them", () => {
		expect(body).toContain("Fee 1% a year")
		expect(body).toContain("Pays out 3.5% a year")
		expect(body).toContain("Fees over the plan")
		expect(body).toContain("Paid out over the plan")
		expect(body).not.toMatch(struck("Fee 1%"))
		expect(body).not.toMatch(struck("Pays out"))
		expect(body).not.toMatch(struck("9.00"))
		expect(body).not.toMatch(struck("4.00"))
	})
})
