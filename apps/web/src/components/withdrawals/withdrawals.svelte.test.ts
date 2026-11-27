import { afterAll, afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession } from "../../client/edit.svelte.js"
import { preferences } from "../../client/preferences.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { fakeServer, HASH, held, settle, useSessionHooks } from "../../client/what-if.test-support"
import { scenarioFlow } from "../../lib/contract"
import { NO_ITEM_NAMES } from "../../lib/view/item-names"
import { overviewView } from "../../lib/view/overview/view"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import { withdrawalsView } from "../../lib/view/withdrawals"
import { CTX } from "../../lib/view/withdrawals/fixtures.test-support"
import OverviewGrid from "../overview/OverviewGrid.svelte"
import WithdrawalsCard from "../overview/WithdrawalsCard.svelte"
import SpendingForm from "./SpendingForm.svelte"
import WithdrawalsBody from "./WithdrawalsBody.svelte"
import WithdrawalsResult from "./WithdrawalsResult.svelte"

useSessionHooks()

const page = (terms = "both") =>
	render(WithdrawalsBody, { props: { snapshot: DEMO, scenario: "base", terms, onTerms: () => {} } })
		.body
const form = (flowId?: string, ctx = CTX) =>
	render(SpendingForm, {
		props: { name: "base", contentHash: HASH, ctx, household: null, flowId, onDone: () => {} },
	}).body

afterEach(() => {
	editSession.token = null
	editSession.error = null
	preferences.hidden = false
})
afterAll(() => {
	preferences.hidden = false
	editSession.token = null
})

describe("the Withdrawals page", () => {
	test("states each Rule year with its share and what the rule did, in words", () => {
		const body = page()
		expect(body).toMatch(
			/Year by year: (<!--.*?-->)*<code[^>]*data-item="retirement-spending"[^>]*>retirement-spending<\/code>/,
		)
		expect(body).toContain("862,256.24")
		expect(body).toContain("3.99%")
		expect(body).toContain("Followed the rule")
		expect(body).toContain("Cut: the share had grown too large")
	})

	test("shows nominal and today's money together, or each alone, from the terms", () => {
		expect(page("both")).toContain("in today's money")
		expect(page("both")).toContain("429,426.52")
		expect(page("nominal")).not.toContain("429,426.52")
		const real = page("real")
		expect(real).toContain("429,426.52")
		expect(real).not.toContain("862,256.24")
	})

	test("states the chance, the Bands and the lowest year with the paths it counts, each level in words", () => {
		const body = page()
		expect(body).toContain("In good and bad markets")
		expect(body).toContain("96.5%")
		expect(body).toContain("Lasts to 2053 in 193 of 200 markets.")
		expect(body).toContain("In the worst years you would spend")
		expect(body).toContain("Worst 1 in 10 paths")
		expect(body).toContain("211,506.76")
		expect(body).toContain("It counts 200 of 200 paths")
		expect(body).toContain("a path that ran out counts 0")
	})

	test("Hide amounts masks every amount and the Band axis", () => {
		preferences.hidden = true
		const body = page()
		for (const shown of ["862,256.24", "429,426.52", "211,506.76", "21,556,406.02"]) {
			expect(body).not.toContain(shown)
		}
		expect(body).toContain("amount hidden")
	})

	test("fits a phone: every table scrolls inside its own wrapper, so the page does not scroll sideways", () => {
		const body = page()
		expect(body).toContain("max-w-full overflow-auto")
		expect(body).not.toContain("min-w-[")
	})

	test("a plan with no rule says so, and does not pre-fill a rate", () => {
		const bare = render(WithdrawalsBody, {
			props: { snapshot: DEMO, scenario: "retire-early", terms: "both", onTerms: () => {} },
		}).body
		expect(bare).toContain("No spending rule in this plan")
		expect(bare).toContain("each is your own estimate")
	})

	test("a Saved plan block of a plan with no spending Flow says there is no rule yet, not that it is a level amount", () => {
		const chance = DEMO.reads.chance["base"]
		const view = withdrawalsView(
			null,
			chance?.ok ? { ...chance.data, spendingBands: undefined } : null,
		)
		const props = { view, terms: "both" as const, title: "Saved plan", names: NO_ITEM_NAMES }
		const none = render(WithdrawalsResult, { props: { ...props, spends: false } }).body
		expect(none).toContain("There is no spending rule in this plan yet")
		expect(none).not.toContain("A level amount has no rule years")
		expect(render(WithdrawalsResult, { props }).body).toContain("A level amount has no rule years")
	})

	test("the Edit control is shown only when the server answers a session", () => {
		editSession.token = null
		expect(page()).not.toContain("Change retirement-spending")
		editSession.token = "t"
		expect(page()).toContain("Change retirement-spending")
	})
})

describe("the form", () => {
	test("a new one holds no rate and no rounding, and asks how you spend first", () => {
		const body = form()
		expect(body).toContain("Choose how you spend")
		expect(body).toContain('aria-label="Set how you spend in retirement"')
		expect(body).toContain("Try as a what-if")
		expect(body).toContain("each is your own estimate")
		expect(body).not.toContain("Your own estimate. A percent")
	})

	test("how it is paid is a choice to make: a Flow paid some other way opens on it", () => {
		const level = form("retirement-spending", {
			...CTX,
			doc: {
				...CTX.doc,
				flows: [
					...CTX.doc.flows,
					scenarioFlow.parse({
						id: "retirement-spending",
						kind: "expense",
						frequency: "weekly",
						start: "2026-10-31",
						amount: "1.00",
						growth: "inflation",
					}),
				],
			},
		})
		expect(level).toContain("Choose how it is paid")
	})

	test("an edited rule shows its rate as the CLI states it, and says the rate is the person's own estimate", () => {
		const flow = scenarioFlow.parse({
			id: "retirement-spending",
			kind: "expense",
			frequency: "monthly",
			start: "2026-10-31",
			startAt: "retire",
			rule: {
				kind: "guardrails",
				portfolio: ["cash"],
				rateBps: "4.00",
				rounding: "halfUp",
				upper: { bps: "20.00", adjustBps: "10.00" },
			},
		})
		const ctx = { ...CTX, doc: { ...CTX.doc, flows: [...CTX.doc.flows, flow] } }
		const body = form("retirement-spending", ctx)
		expect(body).toContain('value="4.00"')
		expect(body).toContain("Your own estimate")
		expect(body).toContain("Cut after the share grows too large")
		expect(body).toContain("Raise after the share grows too small")
		expect(body).toMatch(
			/Stop (<!--.*?-->)*<code[^>]*data-item="rent"[^>]*>rent<\/code>(<!--.*?-->)* when this starts/,
		)
		expect(body).not.toMatch(/value="rent"[^>]*checked/)
	})
})

describe("the Home card: you could spend", () => {
	test("states the first Rule year's amount and share, and links to the page", () => {
		const view = overviewView(DEMO)
		const body = render(WithdrawalsCard, { props: { scenario: view.withdrawals } }).body
		expect(body).toContain("You could spend")
		expect(body).toContain("862,256.24")
		expect(body).toContain("3.99% of your savings")
		expect(body).toContain("/optimize/withdrawals/")
	})

	test("is not shown for a plan with no rule", () => {
		const other = overviewView({
			...DEMO,
			params: { ...DEMO.params, compare: null, scenarios: ["retire-early"] },
		})
		expect(render(OverviewGrid, { props: { view: other } }).body).not.toContain("You could spend")
	})
})

describe("trying another way", () => {
	test("a what-if shows its figures beside the saved plan's, chance included", async () => {
		fakeServer()
		whatIfSession.tryFlow("base", HASH, {
			stored: undefined,
			edited: { id: "x", kind: "expense", frequency: "monthly", start: "2030-01-01" },
		})
		await settle()
		held[0]?.settle(200, {
			ok: true,
			reads: {
				projection: DEMO.reads.projections["base"],
				fi: DEMO.reads.fi["base"],
				compare: DEMO.reads.compare,
				chance: DEMO.reads.chance["base"] ?? null,
			},
		})
		await settle(50)
		const body = page()
		expect(body).toContain("With your try")
		expect(body).toContain("Saved plan")
		expect(body.match(/chance\. Lasts to/g)).toHaveLength(2)
	})
})
