import { formatDate } from "../format"
import { termsWords } from "./reports/source"
import type { SnapshotState } from "./state"

/** What the header of a printed page says: the plan, the As-of date, the terms, and whether the figures are a What-if session's. */
export interface PrintHeading {
	readonly plan: string
	readonly asOf: string
	/** The terms in words, such as "Nominal". */
	readonly terms: string
	readonly whatIf: boolean
}

/**
 * The header every printed page carries. The As-of date is the one the plan's projection states, or the
 * Snapshot's own when that read failed. Null while the Snapshot is not ready or holds no plan, so a page
 * with nothing to name prints no header.
 */
export function printHeading(
	state: SnapshotState,
	plan: string,
	terms: string,
	whatIf: boolean,
): PrintHeading | null {
	if (state.status !== "ready" || plan === "") return null
	const read = Object.hasOwn(state.snapshot.reads.projections, plan)
		? state.snapshot.reads.projections[plan]
		: undefined
	const asOf = read?.ok === true ? read.data.asOf : state.snapshot.params.asOf
	return { plan, asOf: formatDate(asOf), terms: termsWords(terms), whatIf }
}

/** The header as one line of text: plan, As-of date, terms, and the What-if session when there is one. */
export function printHeadingText(heading: PrintHeading): string {
	const parts = [heading.plan, `As of ${heading.asOf}`, heading.terms]
	if (heading.whatIf) parts.push("What-if session")
	return parts.join(" · ")
}
