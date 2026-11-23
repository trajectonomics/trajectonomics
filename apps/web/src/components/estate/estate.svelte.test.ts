import { afterAll, afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession } from "../../client/edit.svelte.js"
import { preferences } from "../../client/preferences.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { fakeServer, HASH, held, settle, useSessionHooks } from "../../client/what-if.test-support"
import type { Snapshot } from "../../lib/contract"
import { demoPlan } from "../../lib/view/estate/fixtures.test-support"
import { overviewView } from "../../lib/view/overview/view"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import EstateCard from "../overview/EstateCard.svelte"
import OverviewGrid from "../overview/OverviewGrid.svelte"
import EstateBody from "./EstateBody.svelte"
import EstateForm from "./EstateForm.svelte"

useSessionHooks()

const page = (
	props: { snapshot?: Snapshot; scenario?: string; terms?: string; at?: string } = {},
) =>
	render(EstateBody, {
		props: {
			snapshot: props.snapshot ?? DEMO,
			scenario: props.scenario ?? "base",
			terms: props.terms ?? "both",
			onTerms: () => {},
			at: props.at ?? "",
			onAt: () => {},
		},
	}).body
const form = (name = "base") =>
	render(EstateForm, {
		props: { name, contentHash: HASH, plan: demoPlan(name).doc, onDone: () => {} },
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

describe("the Estate page", () => {
	test("states what heirs receive on the default date, the gross estate, debts, costs, net and gifts, and each line", () => {
		const body = page()
		for (const shown of [
			"15,682,084.15",
			"16,786,385.30",
			"278,928.30",
			"16,507,457.00",
			"825,372.85",
		])
			expect(body).toContain(shown)
		for (const line of ["settlement", "court-and-legal-fees", "temple"])
			expect(body).toContain(line)
		expect(body).toContain("The plan's last year")
		expect(body).toContain("before me and partner reach")
		expect(body).toContain("Where it goes")
		expect(body).toContain("What heirs would receive, year by year")
	})

	test("shows nominal and today's money together, or each alone; only the net and heirs have a real figure, the rest say nominal", () => {
		expect(page({ terms: "both" })).toContain("In today's money")
		expect(page({ terms: "both" })).toContain("7,025,112.99")
		const nominal = page({ terms: "nominal" })
		expect(nominal).not.toContain("7,025,112.99")
		expect(nominal).toContain("15,682,084.15")
		const real = page({ terms: "real" })
		expect(real).toContain("7,025,112.99")
		expect(real).toContain("7,394,855.78")
		expect(real).toContain("(nominal)")
		expect(real).toContain("16,786,385.30")
	})

	test("Hide amounts masks every figure, the diagram and the chart's axis included", () => {
		preferences.hidden = true
		const body = page()
		for (const shown of [
			"15,682,084.15",
			"16,786,385.30",
			"278,928.30",
			"825,372.85",
			"111,064.45",
		])
			expect(body).not.toContain(shown)
		expect(body).toContain("amount hidden")
	})

	test("a negative net is said plainly: heirs receive nothing, the shortfall is stated, and there is no diagram", () => {
		const snapshot = structuredClone(DEMO)
		const run = snapshot.reads.projections["base"]
		const table = run?.ok ? run.data.tables.find((one) => one.name === "estate") : undefined
		const last = table?.name === "estate" ? table.rows.at(-1) : undefined
		if (last === undefined) throw new Error("the Demo has an estate")
		Object.assign(last, { net: "-12500.00", gifts: "0.00", toHeirs: "0.00", realToHeirs: "0.00" })
		const body = page({ snapshot })
		expect(body).toContain("heirs would receive nothing")
		expect(body).toContain("The shortfall is")
		expect(body).toContain("12,500.00")
		expect(body).not.toContain("Where it goes")
	})

	test("a plan with no settlement cost says so, and names inheritance tax as a cost the person adds", () => {
		const body = page({ scenario: "retire-early" })
		expect(body).toContain("states no settlement cost")
		expect(body).toContain("Inheritance tax and transfer fees are not worked out")
		expect(page()).not.toContain("states no settlement cost")
	})

	test("fits a phone: the diagram and the table scroll inside their own wrappers, and nothing else has a fixed width", () => {
		const body = page()
		expect(body).toContain("max-w-full overflow-x-auto")
		expect(body.replace(/max-w-full overflow-x-auto[^>]*>(.|\n)*?<\/table>/g, "")).not.toContain(
			"min-w-[",
		)
	})

	test("the Edit control is shown only when the server answers a session", () => {
		editSession.token = null
		expect(page()).not.toContain("Change your estate lines")
		editSession.token = "t"
		expect(page()).toContain("Change your estate lines")
		expect(page({ scenario: "retire-early" })).toContain("Set your estate lines")
	})

	test("a what-if shows its estate beside the saved plan's", async () => {
		fakeServer()
		whatIfSession.tryChange("base", HASH, (base) => base)
		whatIfSession.setOff("base", HASH, "flows.rent", true)
		await settle()
		held[0]?.settle(200, {
			ok: true,
			reads: {
				projection: DEMO.reads.projections["base"],
				fi: DEMO.reads.fi["base"],
				compare: DEMO.reads.compare,
				chance: null,
			},
		})
		await settle(50)
		const body = page()
		expect(body).toContain("With your try")
		expect(body).toContain("Saved plan")
		whatIfSession.revert()
	})
})

describe("the form", () => {
	test("a plan with no block opens empty, says each line is the person's own, and that inheritance tax is a cost line", () => {
		const body = form("retire-early")
		expect(body).toContain("none is filled in for you")
		expect(body).toContain("Inheritance tax is not worked out")
		expect(body).toContain("Add a cost")
		expect(body).toContain("Add a gift")
		expect(body).not.toContain('value="1')
		expect(body).toContain("Save your first line to try")
		expect(body).not.toContain("Try as a what-if")
	})

	test("a plan with a block shows its lines as the document states them, and offers a try", () => {
		const body = form()
		expect(body).toContain('value="1.00"')
		expect(body).toContain('value="50000.00"')
		expect(body).toContain("Try as a what-if")
		expect(body).toContain("Move up")
	})
})

describe("the Home card: your heirs would receive", () => {
	test("states what heirs receive on the default date, says why that date, and links to the page", () => {
		const body = render(EstateCard, { props: { scenario: overviewView(DEMO).estate } }).body
		expect(body).toContain("Your heirs would receive")
		expect(body).toContain("15,682,084.15")
		expect(body).toContain("the plan's last year")
		expect(body).toContain('href="/estate/')
		expect(render(OverviewGrid, { props: { view: overviewView(DEMO) } }).body).toContain("/estate/")
	})

	test("says when no settlement cost is set, and hides amounts", () => {
		const other = overviewView({
			...DEMO,
			params: { ...DEMO.params, compare: null, scenarios: ["retire-early"] },
		})
		expect(render(EstateCard, { props: { scenario: other.estate } }).body).toContain(
			"No settlement cost is set",
		)
		preferences.hidden = true
		expect(
			render(EstateCard, { props: { scenario: overviewView(DEMO).estate } }).body,
		).not.toContain("15,682,084.15")
	})
})
