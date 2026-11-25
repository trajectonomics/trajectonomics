import { TH_LEVY_READ_PREFIX } from "../levy/filers"

interface ReadMeasure {
	readonly id: string
	readonly op: string
	readonly of?: string
	readonly a?: string
	readonly b?: string
}

/**
 * The ids a `scale` reads, directly or through the sums that read a Filer's tally with the shared
 * share (`read.<filer>.<label>`, and `read.total.<label>` for two Filers).
 *
 * Purpose: Tells a tally that is scaled by a standard rate from one that is only capped or elected.
 * Math: No arithmetic; ids only.
 * Units: Measure ids.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 40(4)–(6), 47, 57 sexies.
 */
export function scaledIds(measures: readonly ReadMeasure[]): ReadonlySet<string | undefined> {
	const scaled = new Set<string | undefined>()
	for (const measure of measures) if (measure.op === "scale") scaled.add(measure.of)
	for (const measure of [...measures].reverse()) {
		if (measure.id.startsWith(TH_LEVY_READ_PREFIX) && scaled.has(measure.id)) {
			scaled.add(measure.a).add(measure.b)
		}
	}
	return scaled
}

/**
 * The bare label of a Filer label: `income.section40_1@me` is `income.section40_1`.
 *
 * Purpose: Lets a Filer's tally carry the figures of its bare label.
 * Math: No arithmetic.
 * Units: Dimensionless label.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Section 57 sexies.
 */
export function bareLabel(label: string): string {
	const at = label.indexOf("@")
	return at < 0 ? label : label.slice(0, at)
}
