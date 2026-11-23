import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { HASH, useSessionHooks } from "../../client/what-if.test-support"
import { scenarioDocument } from "../../lib/contract"
import { realAssetById } from "../../lib/view/plan-items/asset-document"
import { homeDraft, planWithHome } from "../../lib/view/plan-items/asset-fixtures.test-support"
import { assetFromDraft } from "../../lib/view/plan-items/asset-from-draft"
import { assetDraftOf } from "../../lib/view/plan-items/asset-read"
import { homeRun } from "../../lib/view/plan-items/asset-run.test-support"
import { baselineRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { tryAssetInWhatIf } from "./asset-what-if"
import PlanItemDrawer from "./PlanItemDrawer.svelte"
import PlanItemsList from "./PlanItemsList.svelte"

const doc = planWithHome(homeDraft({ saleDate: "2028-07-15" }))

function page(
	kind: "assets" | "income" | "expense",
	options: { editable?: boolean; doc?: typeof doc } = {},
): string {
	return render(PlanItemsList, {
		props: {
			kind,
			name: "base",
			doc: options.doc ?? doc,
			household: null,
			baseline: baselineRead(),
			run: homeRun(),
			editable: options.editable ?? true,
			contentHash: HASH,
		},
	}).body
}

function drawer(drawerState: Record<string, unknown>, document = planDocument()): string {
	return render(PlanItemDrawer, {
		props: {
			drawer: { asset: true, ...drawerState },
			kind: "assets",
			name: "base",
			doc: document,
			household: null,
			baseline: baselineRead(),
			contentHash: HASH,
			onClose: () => {},
		},
	}).body
}

describe("the home on the Assets and debts page", () => {
	test("is a card with its terms, its chart, Edit, and a what-if switch per item", () => {
		const body = page("assets")
		expect(body).toContain("Homes and cars")
		expect(body).toContain('aria-label="Edit asset home"')
		expect(body).toContain("Add a home or car")
		expect(body).toContain("Rises 3.00% a year (your own estimate)")
		expect(body).toContain("1.00% of its value a year")
		expect(body).toContain("Value of home at the close of each year")
		expect(body).toContain("Its loan is paid off on 2028-07-15.")
		expect(body).toContain("Running costs")
		expect(body).toContain('aria-label="Include Sale of home in the what-if"')
		expect(body).toContain("not taxed in this plan unless a Tally label is set")
		expect(body).toContain("The engine reports money not funded")
	})

	test("a row's words and its money are separated by a space", () => {
		const text = page("assets").replace(/<!---->|<[^>]*>/g, "")
		expect(text).toMatch(/On 2027-07-15 for\s+\S*1,500,000\.00/)
		expect(text).toMatch(/With a loan of\s+\S*1,200,000\.00/)
		expect(text).not.toMatch(/for\d|loan of\d/)
	})

	test("an item changed outside the form is named with the right verb", () => {
		const moved = scenarioDocument.parse({
			...doc,
			flows: doc.flows.map((flow) =>
				flow.id === "home-sale" ? { ...flow, derive: { measures: [], result: "none" } } : flow,
			),
		})
		const body = page("assets", { doc: moved })
		expect(body).toMatch(/home-sale, home-selling-cost, home-loan-payoff no longer match what/)
		const one = scenarioDocument.parse({
			...doc,
			flows: doc.flows.map((flow) =>
				flow.id === "home-rent" ? { ...flow, kind: "expense" } : flow,
			),
		})
		expect(page("assets", { doc: one })).toMatch(/home-rent no longer matches/)
	})

	test("its items are not repeated as plain accounts, loans or flows, and the other pages point to the card", () => {
		const body = page("assets")
		expect(body).not.toContain('aria-label="Edit loan home-loan"')
		expect(body).not.toContain("Loans")
		const income = page("income")
		expect(income).not.toContain("home-rent")
		expect(income).toContain("are on its card on")
		expect(income).toContain('href="/assets-and-debts/?scenario=base"')
		expect(page("expense")).not.toContain("home-running")
	})

	test("a read-only page has no Edit and no what-if control", () => {
		const body = page("assets", { editable: false })
		expect(body).not.toContain('aria-label="Edit asset home"')
		expect(body).not.toContain("in the what-if")
	})
})

describe("the card and the form at phone width", () => {
	test("the card, its list, its rows and its chart can shrink, with the chart scrolling inside its own box", () => {
		const body = page("assets")
		expect(body).toMatch(/<li class="min-w-0 [^"]*"/)
		expect(body).toMatch(/<ul class="grid min-w-0 /)
		expect(body).toContain("grid-cols-[auto_minmax(0,1fr)]")
		expect(body).toContain("overflow-x-auto")
		expect(body).not.toMatch(/(?:w|min-w)-\[(?:[4-9]\d\d|\d{4,})px\]/)
	})

	test("the form fills the drawer and holds no fixed width", () => {
		const body = drawer({})
		expect(body).toContain('class="min-w-0 space-y-6"')
		expect(body).toContain("w-full")
		expect(body).not.toMatch(/(?:w|min-w)-\[(?:[4-9]\d\d|\d{4,})px\]/)
	})
})

describe("the form, buying and owning", () => {
	test("says where its running costs and rent start, and why the Baseline's routed asset cannot be owned", () => {
		const body = drawer({})
		expect(body).toContain("start one month after the purchase")
		expect(body).toContain("Bank pays for shortfalls in this plan")
		expect(body).not.toContain('value="bank"')
	})
})

describe("the form holds no percentage until the person types one", () => {
	test("every rate and share field is empty, and the rounding and direction have no choice made", () => {
		const body = drawer({})
		expect(body).toContain("Your own estimate")
		expect(body).toContain("Nothing is filled in for you")
		const inputs = [...body.matchAll(/<input[^>]*>/g)].map((match) => match[0])
		expect(inputs.length).toBeGreaterThan(0)
		for (const input of inputs) expect(input).not.toMatch(/value="[^"]+"/)
		expect(body).not.toMatch(/<option[^>]*selected[^>]*>(Rises|Falls|Round)/)
	})

	test("choosing a percent of the value asks for the rounding, with no option chosen", () => {
		const body = drawer({ id: "home" }, doc)
		expect(body).toContain("Each amount computed from its value rounds")
		expect(body).toContain('value="1.00"')
		expect(body).toContain('value="1500000.00"')
	})
})

describe("a home in a What-if session", () => {
	useSessionHooks()

	test("an item switched off says so on its switch, and the card still shows the plan as stored", () => {
		whatIfSession.setOff("base", HASH, "flows.home-sale", true)
		const body = page("assets")
		expect(body).toContain("Sale: off in this what-if")
		expect(body).toContain("Rises 3.00% a year")
	})

	test("a tried value is a Set of each changed field, and an added item cannot be tried", () => {
		const stored = realAssetById(doc, "home")?.parts
		if (stored === undefined) throw new Error("no home")
		const draft = assetDraftOf(stored)
		const priced = assetFromDraft(
			{ ...draft, price: "1600000.00" },
			{ existing: stored, doc, check: { isNew: false, ownedIds: [] } },
		)
		if (!priced.ok) throw new Error("refused")
		expect(tryAssetInWhatIf("base", HASH, stored, priced.parts)).toEqual([])
		expect(whatIfSession.changesFor("base")?.sets).toEqual([
			{ path: "flows.home-purchase.amount", value: "1600000.00" },
		])
		const bare = assetFromDraft(
			{ ...draft, buyCost: "" },
			{ existing: stored, doc, check: { isNew: false, ownedIds: [] } },
		)
		if (!bare.ok) throw new Error("refused")
		expect(tryAssetInWhatIf("base", HASH, stored, bare.parts)).toEqual(["home-buying-cost"])
	})

	test("a changed loan rate is tried with the rest, and a loan added or taken out is named", () => {
		const stored = realAssetById(doc, "home")?.parts
		if (stored === undefined) throw new Error("no home")
		const draft = assetDraftOf(stored)
		const dearer = assetFromDraft(
			{ ...draft, price: "1600000.00", loan: { ...draft.loan, rate: "6.00" } },
			{ existing: stored, doc, check: { isNew: false, ownedIds: [] } },
		)
		if (!dearer.ok) throw new Error("refused")
		expect(tryAssetInWhatIf("base", HASH, stored, dearer.parts)).toEqual([])
		const paths = whatIfSession.changesFor("base")?.sets.map((set) => set.path) ?? []
		expect(paths).toContain("flows.home-purchase.amount")
		expect(paths).toContain("accounts.home-loan.rate")
		expect(paths).not.toContain("flows.home-sale.derive")
		const cash = assetFromDraft(
			{ ...draft, paying: "savings" },
			{ existing: stored, doc, check: { isNew: false, ownedIds: [] } },
		)
		if (!cash.ok) throw new Error("refused")
		expect(tryAssetInWhatIf("base", HASH, stored, cash.parts)).toContain("the loan")
	})
})
