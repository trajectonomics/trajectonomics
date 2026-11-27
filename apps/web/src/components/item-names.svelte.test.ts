import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../client/browser"
import { replaceSnapshot } from "../client/snapshot.svelte"
import { planCards } from "../lib/view/plans/card"
import { parseRange } from "../lib/view/plans/range"
import { annualRowsOf } from "../lib/view/projection/annual"
import { LOADING } from "../lib/view/state"
import { DEMO } from "../lib/view/what-if/fixtures.test-support"
import HouseholdAnchorForm from "./household/HouseholdAnchorForm.svelte"
import HouseholdCard from "./household/HouseholdCard.svelte"
import MilestonesBody from "./milestones/MilestonesBody.svelte"
import PlanItemsBody from "./plan-items/PlanItemsBody.svelte"
import AnnualTable from "./projection/AnnualTable.svelte"
import ItemName from "./ui/ItemName.svelte"

const base = (() => {
	const read = DEMO.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	return read.data.scenario
})()
const run = (() => {
	const read = DEMO.reads.projections["base"]
	if (read?.ok !== true) throw new Error("the Demo projects its base plan")
	return read.data
})()

beforeEach(() => replaceSnapshot(DEMO))
afterAll(() => snapshotLoader.replace(LOADING))

const household = () =>
	render(HouseholdCard, {
		props: {
			name: "base",
			doc: base.document,
			household: base.household,
			householdHash: base.householdHash,
			editable: true,
		},
	}).body
/** The markup of an id no label names: the words are the id, and the attribute says the CLI did not name it. */
const code = (kind: string, id: string) =>
	new RegExp(
		`<code[^>]*data-item="${id}"[^>]*data-kind="${kind}"[^>]*data-unnamed[^>]*>${id}</code>`,
	)

/** A Demo copy without a label on the base plan's Flows or Milestones, put in the store; its snapshot and that plan. */
function unlabelled() {
	const snapshot = structuredClone(DEMO)
	const read = snapshot.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads its base plan")
	const scenario = read.data.scenario
	for (const flow of scenario.document.flows) delete flow.displayLabel
	type Milestone = { id: string; displayLabel?: string }
	for (const milestone of (scenario.document.milestones as Milestone[] | undefined) ?? []) {
		delete milestone.displayLabel
	}
	replaceSnapshot(snapshot)
	return { snapshot, scenario }
}

describe("the household's people are called by role, never by id", () => {
	test("a card heads with You, Your partner or Child, keeps the id in a row, and Edit says the name", () => {
		const body = household()
		expect(body).toContain(
			'<span class="wrap-anywhere" data-item="me" data-kind="person">You</span>',
		)
		expect(body).toContain(
			'<span class="wrap-anywhere" data-item="partner" data-kind="person">Your partner</span>',
		)
		expect(body).toContain(
			'<span class="wrap-anywhere" data-item="mali" data-kind="person">Child</span>',
		)
		expect(body).toContain('aria-label="Edit You"')
		expect(body).not.toContain('aria-label="Edit me"')
		expect(body).toMatch(/<dt[^>]*>Id<\/dt>\s*<dd><code[^>]*>mali<\/code>/)
	})

	test("an anchor is its item in the plan's words, the date it pins and the person in the household's words", () => {
		const body = household()
		expect(body).toContain('data-item="fund" data-kind="flow">Monthly saving</span>')
		expect(body).toContain("at you, age 60")
		expect(body).toContain("at the child, age 7")
		expect(body).not.toContain("flows.fund.end")
		expect(body).toContain('aria-label="Remove the anchor of Monthly saving ends"')
	})

	test("the anchor form's pickers show the words and keep the id as the value", () => {
		const body = render(HouseholdAnchorForm, {
			props: {
				name: "base",
				household: base.household!,
				householdHash: base.householdHash,
				flows: base.document.flows,
				onDone: () => {},
			},
		}).body
		expect(body).toContain('<option value="me">You</option>')
		expect(body).toContain('<option value="mali">Child</option>')
		expect(body).toContain('<option value="salary">Salary</option>')
	})

	test("the ages of a year read as the household's words", () => {
		const rows = annualRowsOf(run)
		const body = render(AnnualTable, { props: { rows, currency: run.currency } }).body
		expect(body).toMatch(/You \d+, Your partner \d+/)
		expect(body).not.toMatch(/\bme \d+/)
	})
})

describe("a Flow and a Milestone are called by the label the Demo's plan states", () => {
	test("a Flow card heads with its label, and Edit says it", () => {
		const body = render(PlanItemsBody, {
			props: { snapshot: DEMO, kind: "income", scenario: "base", editable: true },
		}).body
		expect(body).toContain('data-item="salary" data-kind="flow">Salary</span>')
		expect(body).toContain('aria-label="Edit Salary"')
	})

	test("the Milestones page names each one and sets the chart's marks in words", () => {
		const body = render(MilestonesBody, {
			props: { run, argv: [], terms: "both", onTerms: () => {} },
		}).body
		expect(body).toContain('data-item="car-paid-off" data-kind="milestone">Car paid off</span>')
		expect(body).toContain('data-item="sabbatical" data-kind="milestone">Sabbatical</span>')
		expect(body).toMatch(/data-marker-label=""[^>]*>10M net worth<\/text>/)
		expect(body).not.toMatch(/class="[^"]*font-mono[^"]*">10M net worth<\/text>/)
	})

	test("the Plans page's markers carry the label and are not marked as code", () => {
		const [card] = planCards(DEMO, parseRange("all"))
		expect(card?.markers.map((marker) => [marker.label, marker.code ?? false])).toEqual([
			["Car paid off", false],
			["10M net worth", false],
		])
	})
})

describe("a label the plan states is shown in place of the id", () => {
	const labelled = (): typeof DEMO => {
		const next = structuredClone(DEMO)
		const read = next.reads.documents["base"]
		if (read?.ok !== true) throw new Error("the Demo reads its base plan")
		const document = read.data.scenario.document
		const flow = document.flows[0]
		if (flow !== undefined) flow.displayLabel = "Salary"
		document.milestones = [{ id: "car-paid-off", displayLabel: "Car paid off" }]
		return next
	}

	test("a Flow and a Milestone show the label, and one without a label keeps its id in code", () => {
		replaceSnapshot(labelled())
		const salary = render(ItemName, { props: { kind: "flow", id: "salary" } }).body
		expect(salary).toContain('data-item="salary"')
		expect(salary).toContain(">Salary</span>")
		const milestone = render(ItemName, { props: { kind: "milestone", id: "car-paid-off" } })
		expect(milestone.body).toContain(">Car paid off</span>")
		const bare = render(ItemName, { props: { kind: "milestone", id: "sabbatical" } }).body
		expect(bare).toMatch(code("milestone", "sabbatical"))
	})
})

describe("a Flow and a Milestone the plan states no label for show the id in code", () => {
	test("a Flow card heads with its id in code, and Edit says it", () => {
		const { snapshot } = unlabelled()
		const body = render(PlanItemsBody, {
			props: { snapshot, kind: "income", scenario: "base", editable: true },
		}).body
		expect(body).toMatch(code("flow", "salary"))
		expect(body).toContain('aria-label="Edit salary"')
	})

	test("an anchor is its item's id in code, the date it pins and the person's words", () => {
		const { scenario } = unlabelled()
		const body = render(HouseholdCard, {
			props: {
				name: "base",
				doc: scenario.document,
				household: scenario.household,
				contentHash: scenario.contentHash,
				editable: true,
			},
		}).body
		expect(body).toMatch(code("flow", "fund"))
		expect(body).toContain("at you, age 60")
		expect(body).toContain('aria-label="Remove the anchor of fund ends"')
	})

	test("the anchor form's pickers show the id as the option's words", () => {
		const { scenario } = unlabelled()
		const body = render(HouseholdAnchorForm, {
			props: {
				name: "base",
				household: scenario.household!,
				contentHash: scenario.contentHash,
				flows: scenario.document.flows,
				onDone: () => {},
			},
		}).body
		expect(body).toContain('<option value="salary">salary</option>')
	})

	test("the Milestones page lists each id in code and sets the chart's marks in code", () => {
		unlabelled()
		const body = render(MilestonesBody, {
			props: { run, argv: [], terms: "both", onTerms: () => {} },
		}).body
		expect(body).toMatch(code("milestone", "car-paid-off"))
		expect(body).toMatch(code("milestone", "sabbatical"))
		expect(body).toMatch(/class="[^"]*font-mono[^"]*">net-worth-ten-million<\/text>/)
	})

	test("the Plans page's markers carry the id and are marked as code", () => {
		const [card] = planCards(unlabelled().snapshot, parseRange("all"))
		expect(card?.markers.map((marker) => [marker.label, marker.code ?? false])).toEqual([
			["car-paid-off", true],
			["net-worth-ten-million", true],
		])
	})
})
