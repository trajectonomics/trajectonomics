import type { LineMarker, LineSeries } from "../../chart"
import type { FlowInput } from "../../chart/flow"
import type { ProjectionRun } from "../../contract"
import type { Terms } from "../projection/terms"
import { estateFlow } from "./diagram"
import { type EstateFigures, figuresAt } from "./figures"
import { chosenMarker, heirsSeries } from "./series"

/** What the Estate page shows of one run (the saved plan or a what-if) on one date. */
export interface EstateView {
	readonly figures: EstateFigures
	/** What heirs would receive by year, for the terms asked for, with a mark on the date read. */
	readonly series: readonly LineSeries[]
	readonly markers: readonly LineMarker[]
	/** The flow diagram's bands; null when the net estate is negative, which the page says in words. */
	readonly flow: FlowInput | null
}

/** The view of a run on a date, or null when the run states no estate (it was made without `--estate`). Pure; every figure the CLI's. */
export function estateView(run: ProjectionRun, date: string, terms: Terms): EstateView | null {
	const figures = figuresAt(run, date)
	if (figures === null) return null
	return {
		figures,
		series: heirsSeries(run, terms),
		markers: chosenMarker(run, figures.date),
		flow: estateFlow(figures),
	}
}
