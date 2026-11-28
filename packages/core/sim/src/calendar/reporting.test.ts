import { describe, expect, it } from "bun:test"
import { reportingYearOf, reportingYears } from "./reporting"

describe("reportingYearOf", () => {
	it("names the year by the calendar year whose year-start month began it", () => {
		expect(reportingYearOf("2026-11-15", 1)).toBe(2026)
		expect(reportingYearOf("2026-02-10", 4)).toBe(2025)
		expect(reportingYearOf("2026-04-01", 4)).toBe(2026)
		expect(reportingYearOf("2028-02-29", 3)).toBe(2027)
		expect(reportingYearOf("2026-12-31", 12)).toBe(2026)
		expect(reportingYearOf("2026-11-30", 12)).toBe(2025)
	})
})

describe("reportingYears", () => {
	it("runs a full year from the year-start day to the day before the next one", () => {
		expect(reportingYears("2026-11-01", "2028-03-15", undefined, 11)).toEqual([
			{ year: 2026, from: "2026-11-01", to: "2027-10-31", partial: false },
			{ year: 2027, from: "2027-11-01", to: "2028-03-15", partial: true },
		])
	})

	it("cuts the first year at the As-of and the last at the horizon", () => {
		expect(reportingYears("2026-11-28", "2027-12-31", undefined, 1)).toEqual([
			{ year: 2026, from: "2026-11-28", to: "2026-12-31", partial: true },
			{ year: 2027, from: "2027-01-01", to: "2027-12-31", partial: false },
		])
	})

	it("states one full year and no empty year after it", () => {
		expect(reportingYears("2026-01-01", "2026-12-31", undefined, 1)).toEqual([
			{ year: 2026, from: "2026-01-01", to: "2026-12-31", partial: false },
		])
	})

	it("marks a year the run-out ends as partial, even on its nominal last day", () => {
		expect(reportingYears("2026-01-01", "2026-12-31", "2026-12-31", 1)).toEqual([
			{ year: 2026, from: "2026-01-01", to: "2026-12-31", partial: true },
		])
	})

	it("states one one-day year when the horizon is the As-of", () => {
		expect(reportingYears("2026-01-01", "2026-01-01", undefined, 1)).toEqual([
			{ year: 2026, from: "2026-01-01", to: "2026-01-01", partial: true },
		])
	})

	it("anchors a March year's last day on the calendar, so a leap year ends on 29 February", () => {
		expect(reportingYears("2027-03-01", "2028-03-01", undefined, 3)).toEqual([
			{ year: 2027, from: "2027-03-01", to: "2028-02-29", partial: false },
			{ year: 2028, from: "2028-03-01", to: "2028-03-01", partial: true },
		])
	})
})
