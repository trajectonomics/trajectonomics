import type { ProjectionCompare, TaxYear } from "../../contract"
import { formatDate, periodWords } from "../../format"
import { type Cell, moneyCell, textCell } from "../compare/cell"
import type { Triple } from "./triple"

/** The reason a tax year has no change: the compare states a change per roll-up, not per tax year. */
const NO_TAX_YEAR_CHANGE = "The CLI states the tax's change per year, not per tax year"

/** One tax year with its what-if and baseline figures, matched by Levy and period. */
export interface TaxYearTriples {
	readonly key: string
	readonly levy: string
	/** The Filer whose Return this year files, for a separate filing; null when the plan keeps one Return. */
	readonly filer: string | null
	readonly period: string
	readonly settles: string
	readonly figures: readonly Triple[]
}

const keyOf = (year: TaxYear) => `${year.levy}|${year.from}|${year.to}`

function cellOf(year: TaxYear | undefined, field: "due" | "prepaid" | "owed"): Cell {
	return year === undefined ? textCell("No such year") : moneyCell(year[field])
}

/**
 * The tax years of a what-if beside the baseline's: both sides' `taxYears` from the compare, matched by Levy
 * and period, the what-if's order first and then any year only the baseline has. The compare states no
 * change per tax year, so each figure shows none; the Levy's change per year is `yearRows`.
 */
export function taxYearTriples(data: ProjectionCompare): readonly TaxYearTriples[] {
	const { a, b } = data.sides
	const keys = [
		...b.taxYears,
		...a.taxYears.filter((year) => !b.taxYears.some((o) => keyOf(o) === keyOf(year))),
	]
	return keys.map((year) => {
		const key = keyOf(year)
		const whatIf = b.taxYears.find((candidate) => keyOf(candidate) === key)
		const baseline = a.taxYears.find((candidate) => keyOf(candidate) === key)
		const figures = (["due", "prepaid", "owed"] as const).map(
			(field): Triple => ({
				key: field,
				label: field.charAt(0).toUpperCase() + field.slice(1),
				whatIf: cellOf(whatIf, field),
				baseline: cellOf(baseline, field),
				change: { kind: "none", reason: NO_TAX_YEAR_CHANGE },
			}),
		)
		return {
			key,
			levy: year.levy,
			filer: year.filer ?? null,
			period: periodWords(year.from, year.to),
			settles: formatDate(year.settlementDate),
			figures,
		}
	})
}
