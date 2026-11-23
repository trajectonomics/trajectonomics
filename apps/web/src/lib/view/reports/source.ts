import type { ProjectionRun, Snapshot } from "../../contract"
import type { WhatIfLens } from "../../what-if/lens"
import { parseTerms, type Terms } from "../projection/terms"

/** The projection a report exports: the plan's own, or the What-if session's when the session is on this plan. */
export interface ReportSource {
	readonly plan: string
	/** The As-of date the run states. */
	readonly asOf: string
	/** Whether the figures are the What-if session's, so the file names end in `-what-if`. */
	readonly whatIf: boolean
	readonly run: ProjectionRun
}

/** The run a report exports for a plan, or null when the Snapshot holds none for it. */
export function reportSource(
	reads: Pick<Snapshot["reads"], "projections">,
	plan: string,
	lens: WhatIfLens | null,
): ReportSource | null {
	const session = lens?.run ?? null
	const read = Object.hasOwn(reads.projections, plan) ? reads.projections[plan] : undefined
	const run: ProjectionRun | null = session ?? (read?.ok === true ? read.data : null)
	if (run === null) return null
	return { plan, asOf: run.asOf, whatIf: session !== null, run }
}

/** The words the print header gives the terms the page shows figures in. */
export function termsWords(raw: string): string {
	const terms: Terms = parseTerms(raw)
	if (terms === "nominal") return "Nominal"
	if (terms === "real") return "Real, in As-of terms"
	return "Nominal and real, in As-of terms"
}
