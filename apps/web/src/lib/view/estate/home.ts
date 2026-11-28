import type { HouseholdDocument, ProjectionRun, ScenarioDocument } from "../../contract"
import { estateDates } from "./dates"
import { figuresAt } from "./figures"
import { noCostNote } from "./notes"

/** What the Home card says: what heirs would receive on the default date, and whether a cost is stated. */
export interface EstateSummary {
	readonly toHeirs: string
	readonly date: string
	readonly currency: string
	/** The plan states no settlement cost, so the figure is everything owned less debts, which the card says. */
	readonly noCost: boolean
	readonly short: boolean
	/** The CLI's own sentences about the run. */
	readonly notes: readonly string[]
}

/** The card's figures for the default date, or null when the run states no estate. */
export function estateSummaryOf(
	run: ProjectionRun,
	doc: ScenarioDocument | null,
	household: HouseholdDocument | null,
): EstateSummary | null {
	const dates = doc === null ? null : estateDates(run, doc, household, "")
	const date = dates?.chosen.date ?? run.horizon
	const figures = figuresAt(run, date)
	if (figures === null) return null
	return {
		toHeirs: figures.row.toHeirs,
		date: figures.date,
		currency: figures.currency,
		noCost: doc === null || noCostNote(doc) !== null,
		short: figures.shortfall !== null,
		notes: run.notes,
	}
}
