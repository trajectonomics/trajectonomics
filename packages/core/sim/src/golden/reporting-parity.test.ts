import { describe, expect, it } from "bun:test"
import { addDays } from "../calendar/arith"
import { project } from "../engine/project"
import { projectPath } from "../engine/project-path"
import { planReturnModel } from "../market/plan-model"
import type { Projection, ProjectionOptions, Timeline } from "../types"
import { identitySides } from "./cashflow-check"
import { EVERY_PARITY_CASE } from "./every-parity-case"
import type { ParityCase } from "./parity-cases"
import { totalOf, totalSums, yearBounds } from "./reporting-check"

const BASE: ProjectionOptions = { cashflowBreakdown: true }
const YEAR_STARTS = [1, 7] as const
/** Every key `reporting` states (ADR 0034 and its amendments), left out of a report-only comparison. */
const REPORTING_KEYS = new Set([
	"cashflowYears",
	"cashflowYearTotals",
	"cashflowYearTransfers",
	"cashflowMonths",
	"cashflowMonthTotals",
	"cashflowMonthTransfers",
])

/** The case's options without `cashflowBreakdown` and `reporting`. */
function restOf(projectOptions: ProjectionOptions | undefined): ProjectionOptions {
	const { cashflowBreakdown: _breakdown, reporting: _reporting, ...rest } = projectOptions ?? {}
	return rest
}

function statedOptions(base: ProjectionOptions, yearStart: number): ProjectionOptions {
	return { ...base, reporting: { yearStart, years: true, monthsOf: "all" } }
}

function contiguous(
	spans: readonly { readonly from: string; readonly to: string }[],
	start: string,
	end: string,
): void {
	expect(spans[0]?.from).toBe(start)
	expect(spans.at(-1)?.to).toBe(end)
	spans.forEach((span, index) => {
		if (index > 0) expect(span.from).toBe(addDays(spans[index - 1]!.to, 1))
	})
}

/** The identity, the categories, the span bounds and the three partitions of the same days. */
function checkSpans(stated: Projection, start: string, end: string, yearStart: number): void {
	const years = stated.cashflowYears ?? []
	const months = stated.cashflowMonths ?? []
	expect(years.length).toBeGreaterThan(0)
	expect(months.length).toBeGreaterThan(0)
	for (const line of [...years, ...months]) {
		expect(identitySides(line).moneyIn).toBe(identitySides(line).moneyOut)
		expect(totalOf(line.categories)).toBe(totalOf(line.expenses))
		const bounds = yearBounds(line.year, yearStart)
		expect(line.from >= bounds.from).toBe(true)
		expect(line.to <= bounds.to).toBe(true)
	}
	contiguous(years, start, end)
	contiguous(months, start, end)
	expect(Object.fromEntries(totalSums(months))).toEqual(Object.fromEntries(totalSums(years)))
	expect(Object.fromEntries(totalSums(years))).toEqual(
		Object.fromEntries(totalSums(stated.cashflow ?? [])),
	)
}

function checkRun(
	plain: Projection,
	stated: Projection,
	timeline: Timeline,
	yearStart: number,
): void {
	const { cashflowYears: _years, cashflowMonths: _months, ...rest } = stated
	expect(JSON.stringify(rest)).toBe(JSON.stringify(plain))
	checkSpans(stated, timeline.start, plain.runsOut?.date ?? timeline.horizon, yearStart)
}

/** A Projection as JSON, without any key only `reporting` states. */
function withoutReporting(projection: Projection): string {
	const kept = Object.entries(projection).filter(([key]) => !REPORTING_KEYS.has(key))
	return JSON.stringify(Object.fromEntries(kept))
}

/** `reporting` alone adds its own keys and no `cashflow`, and leaves every other key byte-identical. */
function checkReportingAlone(breakdown: Projection, bare: Projection, alone: Projection): void {
	expect(Object.keys(breakdown).filter((key) => !(key in alone))).toEqual(["cashflow"])
	expect(withoutReporting(alone)).toBe(withoutReporting(bare))
}

/** Every `project` run of one fixture, at both Reporting year starts. */
function checkProject(testCase: ParityCase): void {
	const { baseline, scenario, timeline } = testCase.fixture
	const rest = restOf(testCase.projectOptions)
	const base = { ...rest, ...BASE }
	const plain = project(baseline, scenario, timeline, base)
	const bare = project(baseline, scenario, timeline, rest)
	if (!plain.ok || !bare.ok) throw new Error("the parity fixture must project")
	for (const yearStart of YEAR_STARTS) {
		const stated = project(baseline, scenario, timeline, statedOptions(base, yearStart))
		const alone = project(baseline, scenario, timeline, statedOptions(rest, yearStart))
		if (!stated.ok || !alone.ok) throw new Error("the parity fixture must project")
		checkRun(plain.projection, stated.projection, timeline, yearStart)
		checkReportingAlone(plain.projection, bare.projection, alone.projection)
	}
}

/** The same checks on the case's Market path, when it states one. */
function checkPath(testCase: ParityCase): void {
	const path = testCase.path
	if (path === undefined) return
	const { baseline, scenario, timeline } = testCase.fixture
	const built = planReturnModel(scenario, path)
	if (!built.ok) throw new Error("the plan model was refused")
	const selection = { model: built.model, seed: path.seed, paths: path.paths, index: path.index }
	const rest = restOf(testCase.projectOptions)
	const base = { ...rest, ...BASE }
	const plain = projectPath(baseline, scenario, timeline, selection, base)
	const bare = projectPath(baseline, scenario, timeline, selection, rest)
	if (!plain.ok || !bare.ok) throw new Error("the parity fixture must project")
	for (const yearStart of YEAR_STARTS) {
		const stated = projectPath(
			baseline,
			scenario,
			timeline,
			selection,
			statedOptions(base, yearStart),
		)
		const alone = projectPath(
			baseline,
			scenario,
			timeline,
			selection,
			statedOptions(rest, yearStart),
		)
		if (!stated.ok || !alone.ok) throw new Error("the parity fixture must project")
		checkRun(plain.projection, stated.projection, timeline, yearStart)
		checkReportingAlone(plain.projection, bare.projection, alone.projection)
	}
}

describe("the reporting breakdown on every parity fixture", () => {
	it.each(EVERY_PARITY_CASE.map((item) => [item.name, item] as const))(
		"%s: every other key is unchanged and the three partitions of the same days agree",
		(_name, testCase) => {
			checkProject(testCase)
			checkPath(testCase)
		},
	)
})
