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
			contentHash: base.contentHash,
			editable: true,
		},
	}).body
const code = (kind: string, id: string) =>
	new RegExp(
		`<code[^>]*data-item="${id}"[^>]*data-kind="${kind}"[^>]*data-unnamed[^>]*>${id}</code>`,
	)

describe("the household's people are called by role, never by id", () => {
	test("a card heads with You, Your partner or Child, keeps the id in a row, and Edit says the name", () => {
		const body = household()
		expect(body).toContain('<span data-item="me" data-kind="person">You</span>')
		expect(body).toContain('<span data-item="partner" data-kind="person">Your partner</span>')
		expect(body).toContain('<span data-item="mali" data-kind="person">Child</span>')
		expect(body).toContain('aria-label="Edit You"')
		expect(body).not.toContain('aria-label="Edit me"')
		expect(body).toMatch(/<dt[^>]*>Id<\/dt>\s*<dd><code[^>]*>mali<\/code>/)
	})

	test("an anchor is its item in code, the date it pins and the person in the household's words", () => {
		const body = household()
		expect(body).toMatch(code("flow", "fund"))
		expect(body).toContain("at you, age 60")
		expect(body).toContain("at the child, age 6")
		expect(body).not.toContain("flows.fund.end")
		expect(body).toContain('aria-label="Remove the anchor of fund ends"')
	})

	test("the anchor form's pickers show the words and keep the id as the value", () => {
		const body = render(HouseholdAnchorForm, {
			props: {
				name: "base",
				household: base.household!,
				contentHash: base.contentHash,
				flows: base.document.flows,
				onDone: () => {},
			},
		}).body
		expect(body).toContain('<option value="me">You</option>')
		expect(body).toContain('<option value="mali">Child</option>')
		expect(body).toContain('<option value="salary">salary</option>')
	})

	test("the ages of a year read as the household's words", () => {
		const rows = annualRowsOf(run)
		const body = render(AnnualTable, { props: { rows, currency: run.currency } }).body
		expect(body).toMatch(/You \d+, Your partner \d+/)
		expect(body).not.toMatch(/\bme \d+/)
	})
})

describe("a Flow and a Milestone the CLI names only by id show the id in code", () => {
	test("a Flow card heads with its id in code, and Edit says it", () => {
		const body = render(PlanItemsBody, {
			props: { snapshot: DEMO, kind: "income", scenario: "base", editable: true },
		}).body
		expect(body).toMatch(code("flow", "salary"))
		expect(body).toContain('aria-label="Edit salary"')
	})

	test("the Milestones page lists each id in code and sets the chart's marks in code", () => {
		const body = render(MilestonesBody, {
			props: { run, argv: [], terms: "both", onTerms: () => {} },
		}).body
		expect(body).toMatch(code("milestone", "car-paid-off"))
		expect(body).toMatch(code("milestone", "sabbatical"))
		expect(body).toMatch(/class="[^"]*font-mono[^"]*">net-worth-ten-million<\/text>/)
	})

	test("the Plans page's markers carry the id and are marked as code", () => {
		const [card] = planCards(DEMO, parseRange("all"))
		expect(card?.markers.map((marker) => [marker.label, marker.code])).toEqual([
			["car-paid-off", true],
			["net-worth-ten-million", true],
		])
	})
})
