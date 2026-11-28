import type { ProjectionRun } from "../../contract"
import { formatDate } from "../../format"
import type { TaxBody } from "./body"
import type { BracketBar } from "./bracket-bars"
import { pickCurrent } from "./current-year"
import { periodOf } from "./tax-rows"

/** The year the focus bar and answer describe: the walked year, or a hand-written Levy's own figures. */
export interface FocusYear {
	readonly period: string
	readonly owed: string
	readonly settles: string
	readonly bars: readonly BracketBar[]
}

/** The current year's own figures, walked or not; null when the body states no levy or the run no year. */
export function focusYear(
	body: TaxBody,
	years: ProjectionRun["taxYears"],
	asOf: string,
): FocusYear | null {
	if (body.kind !== "levies") return null
	if (body.current !== null) {
		return {
			period: body.current.period,
			owed: body.current.owed,
			settles: body.current.settles,
			bars: body.current.bars ?? [],
		}
	}
	const year = pickCurrent(years, asOf)
	if (year === null) return null
	return {
		period: periodOf(year),
		owed: year.owed,
		settles: formatDate(year.settlementDate),
		bars: [],
	}
}
