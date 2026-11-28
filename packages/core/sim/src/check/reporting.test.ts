import { describe, expect, it } from "bun:test"
import { twoBuckets } from "../chance/path-fixture"
import { project } from "../engine/project"
import { projectPath } from "../engine/project-path"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { partialEnds } from "../golden/reporting-cases"
import type { ProjectionOptions, ProjectionProblem } from "../types"
import { reportingYearRange } from "./reporting"

function withReporting(reporting: unknown): ProjectionOptions {
	return { reporting } as ProjectionOptions
}

function problemsOf(
	options: ProjectionOptions,
	fixture: Fixture = partialEnds,
): readonly ProjectionProblem[] {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, options)
	return result.ok ? [] : result.problems
}

function pathProblemsOf(options: ProjectionOptions): readonly ProjectionProblem[] {
	const result = projectPath(
		partialEnds.baseline,
		partialEnds.scenario,
		partialEnds.timeline,
		{ model: twoBuckets, seed: "0000000000000000", paths: 1, index: 0 },
		options,
	)
	return result.ok ? [] : result.problems
}

function invalid(key?: string): readonly ProjectionProblem[] {
	const path = key === undefined ? ["options", "reporting"] : ["options", "reporting", key]
	return [{ code: "INVALID_OPTION", path }]
}

/** An options object whose `reporting` throws on every read, as a hostile caller can supply. */
function throwingReporting(): unknown {
	const boom = (): never => {
		throw new Error("boom")
	}
	const reporting = {}
	Object.defineProperty(reporting, "yearStart", { enumerable: true, get: boom })
	return reporting
}

describe("the reporting option is refused field by field", () => {
	it.each([
		["a non-object", 5, invalid()],
		["a year start of 0", { yearStart: 0 }, invalid("yearStart")],
		["a year start of 13", { yearStart: 13 }, invalid("yearStart")],
		["a fractional year start", { yearStart: 1.5 }, invalid("yearStart")],
		["a written year start", { yearStart: "1" }, invalid("yearStart")],
		["no year start", {}, invalid("yearStart")],
		["a written years flag", { yearStart: 1, years: "yes" }, invalid("years")],
		["a month before 2026", { yearStart: 1, monthsOf: 2025 }, invalid("monthsOf")],
		["a word month", { yearStart: 1, monthsOf: "last" }, invalid("monthsOf")],
		["a fractional month", { yearStart: 1, monthsOf: 2026.5 }, invalid("monthsOf")],
		["a misspelt key", { yearStart: 1, monthOf: 1 }, invalid("monthOf")],
	])("refuses %s", (_name, reporting, expected) => {
		expect(problemsOf(withReporting(reporting))).toEqual(expected)
		expect(pathProblemsOf(withReporting(reporting))).toEqual(expected)
	})

	it("reports a throwing getter as NOT_AN_OBJECT at the options root, never as a throw", () => {
		const expected: readonly ProjectionProblem[] = [{ code: "NOT_AN_OBJECT", path: ["options"] }]
		expect(problemsOf(withReporting(throwingReporting()))).toEqual(expected)
		expect(pathProblemsOf(withReporting(throwingReporting()))).toEqual(expected)
	})

	it("orders a Timeline problem first and reads no month range from it", () => {
		const backwards = makeFixture({
			accounts: [{ id: "cash", kind: "asset", rate: 0 }],
			balances: { cash: 0 },
			surplus: [{ account: "cash" }],
			withdraw: [],
			start: "2026-06-01",
			horizon: "2026-01-01",
		})
		expect(problemsOf(withReporting({ yearStart: 1, monthsOf: 2030 }), backwards)).toEqual([
			{ code: "HORIZON_BEFORE_START", path: ["timeline", "horizon"] },
		])
	})

	it("reports only the year start when it cannot read a range", () => {
		expect(problemsOf(withReporting({ yearStart: 13, monthsOf: 2030 }))).toEqual(
			invalid("yearStart"),
		)
	})

	it("reports the year start before a bad years flag", () => {
		expect(problemsOf(withReporting({ yearStart: 0, years: "x" }))).toEqual([
			...invalid("yearStart"),
			...invalid("years"),
		])
	})
})

describe("a valid reporting option asks the Projection for its spans", () => {
	it.each([
		["years", { yearStart: 1, years: true }],
		["an absent monthsOf", { yearStart: 1, years: true, monthsOf: undefined }],
		["a year start alone", { yearStart: 4 }],
	])("accepts %s", (_name, reporting) => {
		expect(problemsOf(withReporting(reporting))).toEqual([])
	})

	it("states a Projection with only a year start exactly as the run without reporting", () => {
		const plain = project(partialEnds.baseline, partialEnds.scenario, partialEnds.timeline, {})
		const asked = project(
			partialEnds.baseline,
			partialEnds.scenario,
			partialEnds.timeline,
			withReporting({ yearStart: 4 }),
		)
		if (!plain.ok || !asked.ok) throw new Error("the fixture must project")
		expect(JSON.stringify(asked.projection)).toBe(JSON.stringify(plain.projection))
	})
})

describe("the Reporting years of a Timeline are known before the run", () => {
	it("reads the first and last Reporting year of a valid Timeline", () => {
		expect(reportingYearRange(partialEnds.timeline, 1)).toEqual({ first: 2026, last: 2027 })
	})

	it("is undefined on a date, a skewed horizon or a year start it cannot read", () => {
		expect(reportingYearRange({ start: "nope", horizon: "2027-01-01" }, 1)).toBeUndefined()
		expect(reportingYearRange({ start: "2027-01-01", horizon: "2026-01-01" }, 1)).toBeUndefined()
		expect(reportingYearRange(partialEnds.timeline, 0)).toBeUndefined()
	})
})
