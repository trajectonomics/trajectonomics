import { describe, expect, test } from "bun:test"
import type { ScenarioDocument } from "../../contract"
import { chanceFixture } from "../chance/fixtures.test-support"
import { itemNames } from "../item-names"
import { projectionRunFixture } from "../projection/fixtures.test-support"
import { MILESTONE_ROWS, withMilestones } from "./fixtures.test-support"
import { milestoneFocusView } from "./focus"

const DOC: ScenarioDocument = {
	currency: "THB",
	flows: [],
	accounts: [],
	milestones: [
		{ id: "first-year", displayLabel: "First year" },
		{ id: "second-year", displayLabel: "Second year" },
		{ id: "never", displayLabel: "Sabbatical" },
	],
}

const NAMES = itemNames(new Map(), null, DOC)

const CHANCE = chanceFixture({
	milestones: [
		{
			id: "first-year",
			displayLabel: "First year",
			reached: { paths: 200, share: "100.00%" },
			dates: {
				p10: null,
				p25: null,
				p50: { date: "2026-12-31", ages: [{ person: "me", age: 37 }] },
				p75: null,
				p90: null,
			},
			byYear: [{ year: 2026, paths: 200 }],
		},
	],
})

describe("milestoneFocusView", () => {
	test("answers with the first reached milestone on or after the As-of, and its age", () => {
		const focus = milestoneFocusView(withMilestones(MILESTONE_ROWS), "2026-10-31", CHANCE, NAMES)
		expect(focus?.label).toBe("What's next? First year in Dec 2026. At 37.")
		expect(focus?.tone).toBe("plain")
		expect(focus?.month).toBe("Dec 2026")
		expect(focus?.age).toBe(37)
		expect(focus?.nextId).toBe("first-year")
		expect(focus?.unreachedId).toBeNull()
		expect(focus?.mark).toBeNull()
		expect(focus?.startYear).toBe("2026")
		expect(focus?.endYear).toBe("2028")
		expect(focus?.pins.map((pin) => [pin.key, pin.next, pin.unreached])).toEqual([
			["first-year", true, false],
			["second-year", false, false],
			["never", false, true],
		])
		expect(focus?.pins.map((pin) => pin.x)).toEqual([2 / 26, 12 / 26, 1])
	})

	test("leaves the age out when no Read states one, and keeps the id of an unnamed milestone", () => {
		const focus = milestoneFocusView(withMilestones(MILESTONE_ROWS), "2026-10-31", null)
		expect(focus?.label).toBe("What's next? first-year in Dec 2026.")
		expect(focus?.age).toBeNull()
	})

	test("states no age when the chance read's median date is not the milestone's own", () => {
		const shifted = structuredClone(CHANCE)
		const median = shifted.milestones?.find((one) => one.id === "first-year")?.dates?.p50
		if (median === null || median === undefined) throw new Error("the fixture states a median")
		median.date = "2026-12-30"
		const focus = milestoneFocusView(withMilestones(MILESTONE_ROWS), "2026-10-31", shifted, NAMES)
		expect(focus?.age).toBeNull()
		expect(focus?.label).toBe("What's next? First year in Dec 2026.")
	})

	test("answers with the first unreached milestone in warn tone when none is ahead", () => {
		const focus = milestoneFocusView(withMilestones(MILESTONE_ROWS), "2027-01-01", CHANCE, NAMES)
		expect(focus?.label).toBe("What's next? Second year in Oct 2027.")
		const later = milestoneFocusView(withMilestones(MILESTONE_ROWS), "2028-01-01", null, NAMES)
		expect(later?.label).toBe("What's next? Sabbatical not by Dec 2028.")
		expect(later?.tone).toBe("warn")
		expect(later?.month).toBeNull()
		expect(later?.mark).toBe("not by Dec 2028")
		expect(later?.unreachedId).toBe("never")
		expect(later?.nextId).toBeNull()
	})

	test("counts the date equal to the As-of as ahead, compared as text", () => {
		const focus = milestoneFocusView(
			withMilestones([{ id: "today", reached: true, date: "2026-10-31" }]),
			"2026-10-31",
			null,
		)
		expect(focus?.nextId).toBe("today")
		expect(focus?.pins[0]?.x).toBe(0)
	})

	test("has no focus point for a plan with no milestones, or no table at all", () => {
		expect(milestoneFocusView(withMilestones([]), "2026-10-31", null)).toBeNull()
		expect(milestoneFocusView(projectionRunFixture(), "2026-10-31", null)).toBeNull()
	})
})
