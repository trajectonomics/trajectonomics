import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { type ScenarioDocument, scenarioDocument } from "../../lib/contract"
import { baselineRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import PlanItemDrawer from "./PlanItemDrawer.svelte"
import PlanItemsList from "./PlanItemsList.svelte"
import { HASH } from "./plan-loans.test-support"

/** The fixture plan with a provident fund that takes an employer's 5%, a dividend fund that pays out and charges a fee, and a home. */
function plan(): ScenarioDocument {
	const base = planDocument()
	return scenarioDocument.parse({
		...base,
		accounts: [
			...base.accounts,
			{ id: "provident-fund", kind: "asset", rate: 300 },
			{
				id: "fund",
				kind: "asset",
				rate: 600,
				payout: { bps: "3.50", frequency: "quarterly", rounding: "floor", startAt: "retire" },
				fee: { bps: "1.50", rounding: "halfUp" },
			},
			{ id: "home", kind: "asset", rate: 0, liquid: false },
		],
		milestones: [{ id: "retire", combine: "all", criteria: [] }],
		flows: [
			...base.flows,
			{
				id: "salary-employer",
				kind: "contribution",
				target: "provident-fund",
				funding: "employer",
				frequency: "monthly",
				start: "2026-11-01",
				derive: {
					measures: [
						{ id: "pay", op: "flow", flow: "salary" },
						{ id: "share", op: "scale", of: "pay", num: 500, den: 10000, rounding: "floor" },
					],
					result: "share",
				},
			},
		],
	})
}

function drawer(id: string | undefined, kind: "income" | "assets"): string {
	return render(PlanItemDrawer, {
		props: {
			drawer: id === undefined ? {} : { id },
			kind,
			name: "base",
			doc: plan(),
			household: null,
			baseline: baselineRead(),
			contentHash: HASH,
			onClose: () => {},
		},
	}).body
}

function list(kind: "income" | "assets"): string {
	return render(PlanItemsList, {
		props: {
			kind,
			name: "base",
			doc: plan(),
			household: null,
			baseline: baselineRead(),
			editable: true,
			contentHash: HASH,
		},
	}).body
}

describe("the salary form at phone width", () => {
	const body = drawer("salary", "income")

	test("offers what the employer also pays into, an account picker of the liquid assets, and a share typed as text", () => {
		expect(body).toContain("Your employer also pays into")
		expect(body).toMatch(/<select[^>]*id="employer-account"/)
		expect(body).toContain(">provident-fund</option>")
		expect(body).not.toContain(">home</option>")
		expect(body).not.toContain(">loan</option>")
		expect(body).toMatch(/<input[^>]*id="employer-share"[^>]*inputmode="decimal"/)
	})

	test("shows what is saved, and a salary with no employer share opens with the section empty", () => {
		expect(body).toContain('value="5.00"')
		const without = render(PlanItemDrawer, {
			props: {
				drawer: {},
				kind: "income",
				name: "base",
				doc: planDocument(),
				household: null,
				baseline: baselineRead(),
				contentHash: HASH,
				onClose: () => {},
			},
		}).body
		expect(without).toContain("Choose an account")
		expect(without).not.toMatch(/id="employer-share"[^>]*value="[^"]/)
	})

	test("is one column that can shrink: the fields are full width and the section is a fieldset that may be narrower than its content", () => {
		expect(body).toMatch(/<fieldset class="min-w-0 /)
		expect(body).not.toMatch(/grid-cols/)
		expect(body).toContain('class="w-full rounded-md')
	})
})

describe("the account form at phone width", () => {
	test("offers Pays out and Yearly fee with every choice open: no rounding and no frequency chosen", () => {
		const body = drawer("fund", "assets")
		expect(body).toContain("Pays out")
		expect(body).toContain("Yearly fee")
		expect(body).toContain("Twice a year")
		expect(body).toContain("Choose how to round")
		expect(body).toContain('value="3.50"')
		expect(body).toContain('value="1.50"')
		expect(body).toMatch(/<fieldset class="min-w-0 /)
		expect(body).not.toMatch(/grid-cols/)
	})

	test("a new account offers both sections empty, and a plan with no Levy does not ask the kind of income for tax", () => {
		const { levies: _levies, ...untaxed } = plan()
		const body = render(PlanItemDrawer, {
			props: {
				drawer: {},
				kind: "assets",
				name: "base",
				doc: untaxed,
				household: null,
				baseline: baselineRead(),
				contentHash: HASH,
				onClose: () => {},
			},
		}).body
		expect(body).toContain("Pays out")
		expect(body).toContain("Choose how often")
		expect(body).not.toContain("Kind of income for tax")
		expect(body).not.toMatch(/id="payout-rate"[^>]*value="[^"]/)
	})

	test("under a Levy the kind of income is asked, with none chosen", () => {
		const taxed = scenarioDocument.parse({ ...plan(), levies: [{ id: "th-pit" }] })
		const body = render(PlanItemDrawer, {
			props: {
				drawer: { id: "fund" },
				kind: "assets",
				name: "base",
				doc: taxed,
				household: null,
				baseline: baselineRead(),
				contentHash: HASH,
				onClose: () => {},
			},
		}).body
		expect(body).toContain("Kind of income for tax")
		expect(body).toContain("Choose the kind of income")
	})

	test("an illiquid asset offers neither section, and a debt's form offers none either", () => {
		const home = drawer("home", "assets")
		expect(home).not.toContain("Yearly fee")
		expect(home).not.toContain("Share paid out each year")
		const debt = drawer("loan", "assets")
		expect(debt).not.toContain("Yearly fee")
	})
})

describe("the cards", () => {
	test("a salary says what its employer adds, and the employer's Flow is no card of its own", () => {
		const body = list("income")
		expect(body).toContain("Employer adds 5% to provident-fund")
		expect(body).not.toContain("salary-employer")
	})

	test("an account says what it pays out and what it is charged", () => {
		const body = list("assets")
		expect(body).toContain("Pays out 3.5% a year from retire")
		expect(body).toContain("Fee 1.5% a year")
		expect(body).toContain("Paid quarterly")
	})
})
