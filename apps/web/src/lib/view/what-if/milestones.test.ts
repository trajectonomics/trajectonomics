import { describe, expect, test } from "bun:test"
import { itemNames, NO_ITEM_NAMES } from "../item-names"
import { DEMO_COMPARE, statedCompare } from "./fixtures.test-support"
import { milestoneTriples } from "./milestones"

const LABELLED = itemNames(new Map(), null, {
	currency: "THB",
	accounts: [],
	flows: [],
	milestones: [{ id: "car-paid-off", displayLabel: "Car paid off" }],
})

describe("the milestones", () => {
	test("a Milestone reads the name the plan states for it, or its id when it states none", () => {
		const labelled = milestoneTriples(statedCompare(), LABELLED)
		expect(labelled.find((triple) => triple.key === "car-paid-off")?.label).toBe("Car paid off")
		const bare = milestoneTriples(statedCompare(), NO_ITEM_NAMES)
		expect(bare.find((triple) => triple.key === "car-paid-off")?.label).toBe("car-paid-off")
	})

	test("a milestone moved shows the CLI's months; one reached only in the what-if reads not reached beside it", () => {
		const triples = milestoneTriples(statedCompare())
		expect(triples.map((triple) => triple.key)).toEqual([
			"car-paid-off",
			"net-worth-ten-million",
			"sabbatical",
		])
		expect(triples[0]?.change).toEqual({ kind: "count", text: "−3 months", words: "earlier" })
		expect(triples[1]?.change).toEqual({ kind: "same" })
		expect(triples[2]?.baseline.value).toEqual({ kind: "text", text: "Not reached" })
		expect(triples[2]?.whatIf.value).toEqual({ kind: "text", text: "1 Feb 2041" })
		expect(triples[2]?.change.kind).toBe("none")
	})

	test("a milestone only one side declares reads not in this plan, with no change", () => {
		const compare = statedCompare()
		compare.sides.b.milestones = compare.sides.b.milestones?.filter(
			(row) => row.id !== "sabbatical",
		)
		compare.deltas.milestones = compare.deltas.milestones?.filter((row) => row.id !== "sabbatical")
		const sabbatical = milestoneTriples(compare).find((triple) => triple.key === "sabbatical")
		expect(sabbatical?.whatIf.value).toEqual({ kind: "text", text: "Not in this plan" })
		expect(sabbatical?.change).toEqual({ kind: "none", reason: "Only one side declares it" })
	})

	test("a milestone neither side reaches says so, and one reached on one side says that", () => {
		const compare = statedCompare()
		for (const side of [compare.sides.a, compare.sides.b])
			for (const row of side.milestones ?? []) if (row.id === "sabbatical") row.date = null
		const sabbatical = milestoneTriples(compare).find((triple) => triple.key === "sabbatical")
		expect(sabbatical?.change).toEqual({ kind: "none", reason: "Neither side reaches it" })
		const reachedOnce = milestoneTriples(statedCompare()).find(
			(triple) => triple.key === "sabbatical",
		)
		expect(reachedOnce?.change).toEqual({ kind: "none", reason: "One side does not reach it" })
	})

	test("a compare with null months shows no change for each milestone", () => {
		const compare = structuredClone(DEMO_COMPARE)
		for (const row of compare.deltas.milestones ?? []) row.months = null
		for (const triple of milestoneTriples(compare)) expect(triple.change.kind).toBe("none")
	})
})
