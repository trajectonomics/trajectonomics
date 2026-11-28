import { describe, expect, it } from "bun:test"
import type { Timeline } from "@trajectonomics/core/sim"
import { isAppError } from "./errors"
import { reportingOptionsOf } from "./projection/reporting-input"
import { errorOf, projection } from "./projection/testing"
import { REPORTING_AS_OF, REPORTING_HORIZON } from "./projection-reporting-plan"
import { reportingHome } from "./projection-reporting-support"

/*
 * `projection run` and `projection path` refusals for the Reporting flags (cli ADR-0086), and the
 * `reportingOptionsOf` object they build: checked before the engine, each refusal names the flag.
 */

const RUN = ["run", "--scenario", "reporting", "--as-of", REPORTING_AS_OF]

const PATH_PREFIX = [
	"path",
	"--scenario",
	"reporting",
	"--as-of",
	REPORTING_AS_OF,
	"--horizon",
	REPORTING_HORIZON,
	"--paths",
	"4",
	"--seed",
	"0123456789abcdef",
	"--index",
	"1",
]

const YEAR_START = "A Reporting year starts on the 1st of this month; 1 makes it the calendar year."
const NEEDS = "Add --breakdown-years for a breakdown per Reporting year, or drop --year-start."
const NAME = "Name a Reporting year by the calendar year it begins in."

type Refusal = { flags: string[]; message: string; hint: string }

const REFUSALS: Refusal[] = [
	{
		flags: ["--year-start", "0", "--breakdown-years"],
		message: "--year-start: 0 is not a month number. Give 1 (January) to 12 (December).",
		hint: YEAR_START,
	},
	{
		flags: ["--year-start", "13", "--breakdown-years"],
		message: "--year-start: 13 is not a month number. Give 1 (January) to 12 (December).",
		hint: YEAR_START,
	},
	{
		flags: ["--year-start", "1.5", "--breakdown-months", "first"],
		message: "--year-start: 1.5 is not a month number. Give 1 (January) to 12 (December).",
		hint: YEAR_START,
	},
	{
		flags: ["--year-start", "4"],
		message: "--year-start applies only with --breakdown-years or --breakdown-months.",
		hint: NEEDS,
	},
	{
		flags: ["--breakdown-months", "26"],
		message: '--breakdown-months: "26" is not first, all or a year such as 2027.',
		hint: NAME,
	},
	{
		flags: ["--breakdown-months", "2026-11"],
		message: '--breakdown-months: "2026-11" is not first, all or a year such as 2027.',
		hint: NAME,
	},
	{
		flags: ["--breakdown-months", "latest"],
		message: '--breakdown-months: "latest" is not first, all or a year such as 2027.',
		hint: NAME,
	},
	{
		flags: ["--breakdown-months", "2025"],
		message:
			"--breakdown-months: 2025 is outside this Projection, whose Reporting years run from 2026 to 2027 (--year-start 1).",
		hint: "Give a year from 2026 to 2027, or move --horizon.",
	},
	{
		flags: ["--breakdown-months", "2028"],
		message:
			"--breakdown-months: 2028 is outside this Projection, whose Reporting years run from 2026 to 2027 (--year-start 1).",
		hint: "Give a year from 2026 to 2027, or move --horizon.",
	},
]

function runFlags(flags: string[]): string[] {
	return [...RUN, "--horizon", REPORTING_HORIZON, ...flags]
}

function pathFlags(home: string, flags: string[]): string[] {
	return [...PATH_PREFIX, "--return-model", `${home}/reporting-model.json`, ...flags]
}

describe("the Reporting flags refuse a bad value at the flag", () => {
	for (const refusal of REFUSALS) {
		it(`projection run refuses ${refusal.flags.join(" ")}`, async () => {
			const home = await reportingHome()
			const res = await projection(home, runFlags(refusal.flags))
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({
				code: "invalid_input",
				message: refusal.message,
				hint: refusal.hint,
			})
		})

		it(`projection path refuses ${refusal.flags.join(" ")}`, async () => {
			const home = await reportingHome()
			const res = await projection(home, pathFlags(home, refusal.flags))
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({
				code: "invalid_input",
				message: refusal.message,
				hint: refusal.hint,
			})
		})
	}

	it("accepts a year inside the Projection", async () => {
		const home = await reportingHome()
		for (const flags of [
			["--breakdown-months", "2027"],
			["--breakdown-months", "all"],
		]) {
			expect((await projection(home, runFlags(flags))).code).toBe(0)
			expect((await projection(home, pathFlags(home, flags))).code).toBe(0)
		}
	})
})

describe("a horizon before the As-of keeps the engine's refusal", () => {
	it("answers HORIZON_BEFORE_START, not a range row", async () => {
		const home = await reportingHome()
		const flags = [
			"--scenario",
			"reporting",
			"--as-of",
			"2027-01-01",
			"--horizon",
			"2026-12-31",
			"--breakdown-months",
			"2027",
		]
		for (const command of ["run", "path"]) {
			const extra =
				command === "path"
					? [
							"--return-model",
							`${home}/reporting-model.json`,
							"--paths",
							"4",
							"--seed",
							"0123456789abcdef",
							"--index",
							"1",
						]
					: []
			const res = await projection(home, [command, ...flags, ...extra])
			expect(res.code).toBe(2)
			expect(errorOf(res)).toMatchObject({
				code: "invalid_input",
				message: "--horizon: HORIZON_BEFORE_START",
				hint: "The Timeline starts at --as-of and ends at --horizon.",
			})
		}
	})
})

describe("reportingOptionsOf writes exactly what was asked", () => {
	const timeline: Timeline = {
		start: REPORTING_AS_OF,
		horizon: REPORTING_HORIZON,
		resolution: "month",
	}

	it("returns nothing when neither breakdown flag was given", () => {
		expect(reportingOptionsOf({ breakdownYears: false }, timeline)).toBeUndefined()
	})

	it("writes no key as undefined, and defaults the month to January", () => {
		expect(reportingOptionsOf({ breakdownYears: true }, timeline)).toEqual({
			yearStart: 1,
			years: true,
		})
		expect(
			reportingOptionsOf({ breakdownYears: false, breakdownMonths: "first" }, timeline),
		).toEqual({ yearStart: 1, monthsOf: "first" })
		expect(
			reportingOptionsOf({ breakdownYears: true, breakdownMonths: "all", yearStart: 4 }, timeline),
		).toEqual({ yearStart: 4, years: true, monthsOf: "all" })
	})

	it("accepts 2027 and refuses a year outside the range", () => {
		expect(
			reportingOptionsOf({ breakdownYears: false, breakdownMonths: "2027" }, timeline),
		).toEqual({ yearStart: 1, monthsOf: 2027 })
		const outside = reportingOptionsOf({ breakdownYears: false, breakdownMonths: "2028" }, timeline)
		expect(isAppError(outside)).toBe(true)
	})
})
