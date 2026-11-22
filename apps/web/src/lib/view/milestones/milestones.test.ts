import { describe, expect, test } from "bun:test"
import { projectionRunFixture } from "../projection/fixtures.test-support"
import { MILESTONE_ROWS, withMilestones } from "./fixtures.test-support"
import { hasMilestones, milestoneMarkers, milestoneRowsOf, milestoneView } from "./milestones"

describe("milestoneView", () => {
	test("lists the reached Milestones in date order, read as text", () => {
		const view = milestoneView(withMilestones(MILESTONE_ROWS))
		expect(view?.reached).toEqual([
			{ id: "first-year", date: "2026-12-31" },
			{ id: "second-year", date: "2027-10-31" },
		])
	})

	test("keeps Scenario order for two Milestones reached on the same day", () => {
		const view = milestoneView(
			withMilestones([
				{ id: "b-second", reached: true, date: "2027-06-01" },
				{ id: "a-first", reached: true, date: "2027-06-01" },
			]),
		)
		expect(view?.reached.map((milestone) => milestone.id)).toEqual(["b-second", "a-first"])
	})

	test("labels an unreached Milestone with the horizon when the plan did not run out", () => {
		const view = milestoneView(withMilestones(MILESTONE_ROWS))
		expect(view?.unreached).toEqual([{ id: "never", notReachedBy: "2028-12-31" }])
	})

	test("labels an unreached Milestone with the run-out date when the plan ran out", () => {
		const view = milestoneView(
			withMilestones(MILESTONE_ROWS, { runsOut: { date: "2028-04-01", unmet: "70359.24" } }),
		)
		expect(view?.unreached).toEqual([{ id: "never", notReachedBy: "2028-04-01" }])
	})

	test("is null for a projection with no milestones table, so the page says the plan declares none", () => {
		expect(milestoneView(projectionRunFixture())).toBeNull()
		expect(milestoneRowsOf(projectionRunFixture())).toBeNull()
	})
})

describe("milestoneMarkers", () => {
	test("puts a mark on the chart for each reached Milestone, at the x of its date", () => {
		const markers = milestoneMarkers(withMilestones(MILESTONE_ROWS))
		// The fixture's rows close at 2027-10-30 (index 0) and 2028-10-30 (index 1), and the last ends 2028-12-31.
		// 2026-12-31 is the 62nd day of a 365-day first row, so it is near its close, not at a whole x.
		expect(markers.map((marker) => marker.label)).toEqual(["first-year", "second-year"])
		expect(markers[0]?.x).toBeCloseTo(-1 + 62 / 365, 10)
		expect(markers[1]?.x).toBeCloseTo(0 + 1 / 366, 10)
	})

	test("draws no mark for an unreached Milestone, and none when the plan has no milestones", () => {
		expect(milestoneMarkers(projectionRunFixture())).toEqual([])
		expect(milestoneMarkers(withMilestones([{ id: "never", reached: false, date: null }]))).toEqual(
			[],
		)
	})
})

describe("hasMilestones", () => {
	test("is true for a projection read with a milestones table, and false without one or without data", () => {
		const ok = (data: ReturnType<typeof projectionRunFixture>) => ({
			argv: [],
			ok: true as const,
			data,
		})
		expect(hasMilestones(ok(withMilestones(MILESTONE_ROWS)))).toBe(true)
		expect(hasMilestones(ok(projectionRunFixture()))).toBe(false)
		expect(hasMilestones(undefined)).toBe(false)
		expect(
			hasMilestones({ argv: [], ok: false, error: { code: "x", exitCode: 1, message: "m" } }),
		).toBe(false)
	})
})
