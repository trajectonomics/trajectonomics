import { project } from "../engine/project"
import type { Fixture } from "../fixtures/fixture"
import type { Projection, ProjectionOptions, ReportingCashflow } from "../types"

/** A fixture's Projection under `options`; a refused run fails the test with its problems. */
export function projected(fixture: Fixture, options: ProjectionOptions): Projection {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, options)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

/** The Reporting months `monthsOf` names. */
export function months(
	fixture: Fixture,
	yearStart: number,
	monthsOf: number | "first" | "all",
): readonly ReportingCashflow[] {
	return projected(fixture, { reporting: { yearStart, monthsOf } }).cashflowMonths ?? []
}

/** The Reporting years. */
export function years(fixture: Fixture, yearStart: number): readonly ReportingCashflow[] {
	return projected(fixture, { reporting: { yearStart, years: true } }).cashflowYears ?? []
}

/** The Reporting month that begins on `from`, when stated. */
export function at(
	fixture: Fixture,
	yearStart: number,
	from: string,
): ReportingCashflow | undefined {
	return months(fixture, yearStart, "all").find((month) => month.from === from)
}
