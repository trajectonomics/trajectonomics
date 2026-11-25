import { describe, expect, test } from "bun:test"
import { DEMO } from "../what-if/fixtures.test-support"
import { notProjected, planCard, planCards } from "./card"
import { ledgerWith } from "./fixtures.test-support"
import { parseRange } from "./range"
import { planRows } from "./rows"

const ALL = parseRange("all")
const TEN = parseRange("10")

describe("planCards", () => {
	test("has one card for each projected plan, the main plan first and then by name", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": { main: true } })
		expect(planCards(snapshot, ALL).map((card) => card.row.name)).toEqual(["retire-early", "base"])
	})

	test("leaves out a plan the dashboard does not project, and lists it as not projected", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": {}, extra: { main: true } })
		expect(planCards(snapshot, ALL).map((card) => card.row.name)).toEqual(["base", "retire-early"])
		expect(notProjected(snapshot).map((row) => [row.name, row.main])).toEqual([["extra", true]])
	})

	test("has no not-projected row when every plan is projected", () => {
		expect(notProjected(ledgerWith({ base: {}, "retire-early": {} }))).toEqual([])
	})
})

describe("a card", () => {
	const snapshot = ledgerWith({
		base: { notes: "Retire at 55.\nSell the condo." },
		"retire-early": {},
	})
	const base = planCard(snapshot, planRows(snapshot)[0]!, ALL)

	test("states the FI month and the ages on it, as the `fi` read does", () => {
		const read = DEMO.reads.fi["base"]
		if (!read?.ok || !read.data.fi.reachable) throw new Error("the Demo's base reaches FI")
		expect(base.fi).toEqual({
			reachable: true,
			month: "Oct 2040",
			ages: read.data.fi.ages.length === 0 ? null : expect.any(String),
		})
	})

	test("states the chance of success when the Snapshot holds the read, and none without it", () => {
		expect(base.chance?.share).toMatch(/%$/)
		const without = structuredClone(snapshot)
		without.reads.chance = {}
		expect(planCard(without, planRows(without)[0]!, ALL).chance).toBeNull()
	})

	test("states net worth at the end of the plan's run, as the CLI wrote it", () => {
		const run = snapshot.reads.projections["base"]
		if (!run?.ok) throw new Error("the Demo holds base")
		const last = run.data.tables
			.flatMap((table) => (table.name === "annual" ? table.rows : []))
			.at(-1)
		expect(base.netWorth?.amount).toBe(last?.closingNetWorth)
	})

	test("shows the notes' first line and keeps the whole text to expand", () => {
		expect(base.notes).toEqual({ first: "Retire at 55.", full: "Retire at 55.\nSell the condo." })
		const other = planCard(snapshot, planRows(snapshot)[1]!, ALL)
		expect(other.notes).toBeNull()
	})

	test("draws one point for each yearly row, with a rule for each Milestone reached", () => {
		expect(base.series).toHaveLength(1)
		expect(base.series[0]?.points).toHaveLength(28)
		expect(base.markers.map((marker) => marker.label)).toEqual([
			"car-paid-off",
			"net-worth-ten-million",
		])
		expect(base.milestones.map((milestone) => milestone.id)).toEqual([
			"car-paid-off",
			"net-worth-ten-million",
		])
	})

	test("a range draws the first rows only, and drops a Milestone no drawn row holds", () => {
		const ten = planCard(snapshot, planRows(snapshot)[0]!, TEN)
		expect(ten.series[0]?.points).toHaveLength(10)
		expect(ten.series[0]?.points.map((point) => point.x)).toEqual(
			base.series[0]?.points.slice(0, 10).map((point) => point.x),
		)
		expect(ten.markers.map((marker) => marker.label)).toEqual(["car-paid-off"])
		expect(ten.milestones.map((milestone) => milestone.id)).toEqual(["car-paid-off"])
		// The figures on the card are the plan's, whatever the range.
		expect(ten.netWorth).toEqual(base.netWorth)
		expect(ten.fi).toEqual(base.fi)
	})

	test("a range changes only which rows are drawn: each drawn point is the CLI's own string", () => {
		const ten = planCard(snapshot, planRows(snapshot)[0]!, TEN)
		const full = base.series[0]?.points ?? []
		expect(ten.series[0]?.points.map((point) => point.display)).toEqual(
			full.slice(0, 10).map((point) => point.display),
		)
	})

	test("a plan whose projection failed carries the CLI's message and draws nothing", () => {
		const broken = structuredClone(snapshot)
		broken.reads.projections["base"] = {
			argv: ["projection", "run"],
			ok: false,
			error: { code: "projection_refused", exitCode: 3, message: "The plan cannot run." },
		}
		const card = planCard(broken, planRows(broken)[0]!, ALL)
		expect(card.problem).toBe("The plan cannot run.")
		expect(card.series).toEqual([])
		expect(card.netWorth).toBeNull()
	})
})
