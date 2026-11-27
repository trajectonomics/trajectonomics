/**
 * The unplaced suggestions of one tax year, keyed apart and named by their Filer when two share a name: a joint
 * Return can hold one "RMF" for each spouse, and the list says whose each one is. Pure.
 */
import type { ItemLabel, PersonNames } from "../item-names"
import { returnLabel } from "../tax-settings/return-name"
import type { YearView } from "./years"

/** One suggestion with no Account: the name and hint the CLI states, and the Filer when two items share a name. */
export interface UnplacedView {
	/** Unique in the list, even when two items share a name. */
	readonly key: string
	readonly name: string
	readonly hint: string
	/** The Filer in the page's words, so two alike names stay apart; null when the name is the year's only one. */
	readonly filer: ItemLabel | null
}

/** The year's unplaced suggestions, each keyed once and told apart by its Filer when the name repeats. */
export function unplacedOf(
	year: YearView,
	people: PersonNames,
	claimsHolder: string | null,
): readonly UnplacedView[] {
	const filers = [
		...new Set(year.lines.flatMap((line) => (line.filer === null ? [] : [line.filer]))),
	]
	const counts = new Map<string, number>()
	for (const one of year.unplaced) counts.set(one.name, (counts.get(one.name) ?? 0) + 1)
	return year.unplaced.map((one, index) => ({
		key: `${one.filer ?? ""}:${one.name}:${index}`,
		name: one.name,
		hint: one.hint,
		filer:
			(counts.get(one.name) ?? 0) > 1 && one.filer !== null
				? returnLabel(one.filer, people, claimsHolder, filers)
				: null,
	}))
}
