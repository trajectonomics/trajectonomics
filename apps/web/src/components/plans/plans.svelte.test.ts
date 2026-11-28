import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { editSession } from "../../client/edit.svelte.js"
import { planEditor } from "../../client/plan-editor.svelte.js"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { ledgerWith } from "../../lib/view/plans/fixtures.test-support"
import { type PlanRow, planRows } from "../../lib/view/plans/rows"
import { LOADING } from "../../lib/view/state"
import PlansPage from "../pages/PlansPage.svelte"
import DeletePlanForm from "./DeletePlanForm.svelte"
import NewPlanForm from "./NewPlanForm.svelte"
import NotesForm from "./NotesForm.svelte"
import PlanDrawer from "./PlanDrawer.svelte"
import RenamePlanForm from "./RenamePlanForm.svelte"

const noop = () => {}
const SNAPSHOT = ledgerWith(
	{
		base: { notes: "Retire at 55.\nSell the condo." },
		"retire-early": { main: true },
		extra: {},
	},
	["base", "retire-early"],
)

beforeEach(() => {
	setTestUrl("http://127.0.0.1/plans/")
	replaceSnapshot(SNAPSHOT)
})
afterEach(() => {
	editSession.token = null
	editSession.error = null
	planEditor.mode = null
})
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

const page = (range = "all", editable = false) =>
	render(PlansPage, { props: { range, onRange: noop, editable } }).body
const rows = planRows(SNAPSHOT)
const row = (name: string): PlanRow => rows.find((one) => one.name === name) as PlanRow

describe("the plans page", () => {
	test("has one card for each projected plan, the main plan first, with its tag", () => {
		const body = page()
		const names = [...body.matchAll(/<h2 class="min-w-0[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])
		expect(names).toEqual(["retire-early", "base"])
		expect(body.match(/>Main</g)).toHaveLength(1)
	})

	test("shows each card's FI date, chance of success, net worth, notes and chart, and opens its Projection", () => {
		const body = page()
		expect(body).toContain("FI date")
		expect(body).toContain("Oct 2040")
		expect(body).toContain("Chance of success")
		expect(body).toMatch(/Net worth at \d+ \w+ \d{4}/)
		expect(body.match(/<svg[^>]*role="img"/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
		expect(body).toContain('href="/projection/?scenario=base"')
		expect(body).toContain('href="/projection/?scenario=retire-early"')
		expect(body).toContain("Open the Plan for base")
		expect(body).toContain("Open the Plan for retire-early")
		expect(body).not.toContain("Open the Overview")
	})

	test("shows the first line of the notes and keeps the rest to expand", () => {
		const body = page()
		expect(body).toMatch(/<summary[^>]*>Retire at 55\.<\/summary>/)
		expect(body).toContain("Sell the condo.")
	})

	test("has a range control with the four ranges, and the chosen one is checked", () => {
		const body = page("20")
		for (const label of ["Next 10 years", "Next 20 years", "Next 30 years", "Whole plan"]) {
			expect(body).toContain(label)
		}
		expect(body).toMatch(/value="20"[^>]*checked/)
	})

	test("a range narrows each chart's rows and leaves every figure as it was", () => {
		const whole = page("all")
		const ten = page("10")
		const years = (body: string) =>
			[...body.matchAll(/text-anchor="middle"[^>]*>(\d{4})<\/text>/g)].map((m) => Number(m[1]))
		expect(Math.max(...years(ten))).toBeLessThan(Math.max(...years(whole)))
		expect(Math.max(...years(ten)) - Math.min(...years(ten))).toBeLessThanOrEqual(10)
		for (const figure of ["Oct 2040", "Chance of success"]) expect(ten).toContain(figure)
		const worth = (body: string) => body.match(/Net worth at[^<]*<\/dt>\s*<dd[^>]*>[\s\S]*?<\/dd>/g)
		expect(worth(ten)).toEqual(worth(whole))
	})

	test("lists a plan outside the dashboard by name, as not projected, with an action only when Edits show", () => {
		expect(page()).toContain("extra")
		expect(page()).toContain("Not projected in this dashboard")
		expect(page()).not.toContain("Add extra to this dashboard")
		expect(page("all", true)).toContain("Add extra to this dashboard")
	})

	test("has the plan menu on each card when Edits show, and none otherwise", () => {
		expect(page()).not.toContain("Actions for")
		const body = page("all", true)
		expect(body).toContain("Actions for base")
		expect(body).toContain("Actions for retire-early")
		expect(body).toContain("Make this my main plan")
	})

	test("fits a phone: one column, long names and notes wrap, and nothing has a fixed width", () => {
		const body = page("all", true)
		expect(body).toContain("grid gap-4 sm:grid-cols-2 xl:grid-cols-3")
		expect(body).toContain("break-words")
		expect(body).toContain("flex flex-wrap")
		expect(body).not.toMatch(/min-w-\[|(?<!max-)w-\[\d/)
		expect(body).not.toContain("overflow-x")
	})

	test("offers the guided first plan when the dashboard holds none, under the page's query", () => {
		setTestUrl("http://127.0.0.1/plans/?demo=1")
		replaceSnapshot({
			...SNAPSHOT,
			params: { ...SNAPSHOT.params, scenarios: [], compare: null },
		})
		const body = page()
		expect(body).toContain("Set up a first plan")
		expect(body).toContain('href="/plans/new/?demo=1"')
		expect(body).not.toContain("plan-range")
	})

	test("shows no guided first-plan entry while a plan exists", () => {
		expect(page()).not.toContain("Set up a first plan")
	})
})

describe("the plan forms", () => {
	const stored = ["base", "retire-early", "extra"]

	test("rename asks for a name, and starts on the plan's own", () => {
		const body = render(RenamePlanForm, {
			props: { row: row("base"), stored, shown: true, onDone: noop },
		}).body
		expect(body).toContain("New name for base")
		expect(body).toContain("Rename")
	})

	test("notes is a text area with a way to remove them", () => {
		const body = render(NotesForm, { props: { name: "base", notes: "x", onDone: noop } }).body
		expect(body).toContain("<textarea")
		expect(body).toContain("Leave it empty to remove the notes.")
	})

	test("a new plan starts from my accounts or from a copy of a plan", () => {
		const body = render(NewPlanForm, {
			props: {
				stored,
				names: ["base", "retire-early"],
				asOf: "2026-10-31",
				copyOf: "",
				onDone: noop,
			},
		}).body
		expect(body).toContain("From my accounts today")
		expect(body).toContain("A copy of")
		expect(body).toContain('<option value="retire-early"')
	})

	test("the Copy action fixes the plan it copies and offers no other start", () => {
		const body = render(NewPlanForm, {
			props: { stored, names: ["base"], asOf: "2026-10-31", copyOf: "base", onDone: noop },
		}).body
		expect(body).toContain("A copy of base.")
		expect(body).not.toContain("From my accounts today")
	})

	test("deleting the main plan says to choose another first, and offers no delete", () => {
		const main = render(DeletePlanForm, {
			props: {
				row: row("retire-early"),
				names: ["retire-early", "base"],
				shown: false,
				onDone: noop,
			},
		}).body
		expect(main).toContain("is your main plan")
		expect(main).not.toContain("Delete plan</button>")
		const other = render(DeletePlanForm, {
			props: { row: row("base"), names: ["retire-early", "base"], shown: false, onDone: noop },
		}).body
		expect(other).toContain("Delete the plan base?")
		expect(other).toContain("Delete plan")
	})

	test("the drawer is shut until a form is opened, and names the form", () => {
		expect(render(PlanDrawer, {}).body).not.toContain("<form")
		planEditor.open("rename", "base")
		const body = render(PlanDrawer, {}).body
		expect(body).toContain("Rename plan")
		expect(body).toContain("New name for base")
	})
})
