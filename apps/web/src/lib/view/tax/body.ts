import type { LineSeries } from "../../chart/line"
import type { ProjectionRun } from "../../contract"
import { type BracketChart, bracketChart } from "./bracket-chart"
import { type CurrentYear, currentYear } from "./current-year"
import { type RateRow, rateRows } from "./rate-rows"
import { taxChart } from "./tax-chart"
import { type TaxHeadline, type TaxRow, taxHeadline, taxRows } from "./tax-rows"

/** What the Tax page shows for one Scenario: no Levy, or the tax years it owes. */
export type TaxBody =
	| { readonly kind: "no-levy" }
	| {
			readonly kind: "levies"
			readonly headline: TaxHeadline
			readonly rows: readonly TaxRow[]
			readonly chart: readonly LineSeries[] | null
			/** The current tax year's walk, brackets and rates; null when the CLI stated none (a hand-written Levy). */
			readonly current: CurrentYear | null
			/** Taxable income by bracket for every year, with the top rate; null when no year states brackets. */
			readonly brackets: BracketChart | null
			/** One row per year of its income, tax and rates; empty when the CLI stated none. */
			readonly rates: readonly RateRow[]
	  }

/** The Tax page's body for a projection: no Levy when the result has no tax years, else its years. */
export function taxBody(run: ProjectionRun): TaxBody {
	const headline = taxHeadline(run.taxYears)
	if (run.tax === "not_applied" || headline === null) return { kind: "no-levy" }
	return {
		kind: "levies",
		headline,
		rows: taxRows(run.taxYears),
		chart: taxChart(run.taxYears),
		current: currentYear(run.taxYears, run.asOf),
		brackets: bracketChart(run.taxYears),
		rates: rateRows(run.taxYears),
	}
}

/** The command that adds Thailand's Levy to a Scenario that has none. */
export function addLevyCommand(name: string): string {
	return `traj scenario tax ${name} --tax th-2026`
}
