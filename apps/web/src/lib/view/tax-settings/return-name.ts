/**
 * The words a tax table gives one Return's Filer. Both the per-year table and the claims table read it, so the same
 * person reads the same way in each: the household's words for a person it names, "The earlier holder" for the
 * recorded `claimsHolder` it no longer names, "Another person" for any other id it no longer names ("Another person
 * (<id>)" when two would read alike, as twins do), and the id, in
 * code, when there is no household at all (web ADR 0029). Pure.
 */
import type { ItemLabel, PersonNames } from "../item-names"
import { ANOTHER_PERSON_LABEL, EARLIER_HOLDER } from "./flat-claims"

/** One Return's Filer in the household's words, its id in code when no household names it, and never an id as a name. */
export function returnLabel(
	id: string,
	people: PersonNames,
	claimsHolder: string | null = null,
	filers: readonly string[] = [],
): ItemLabel {
	const name = people.get(id)
	if (name !== undefined) return { text: name.label, named: true, id, kind: "person" }
	if (people.size === 0) return { text: id, named: false, id, kind: "person" }
	if (id === claimsHolder) return { text: EARLIER_HOLDER.label, named: true, id, kind: "person" }
	// Two Returns that would both read "Another person" take their ids, as twins do, so the rows stay apart.
	const others = new Set(
		filers.filter((one) => people.get(one) === undefined && one !== claimsHolder),
	)
	const text = others.size > 1 ? `${ANOTHER_PERSON_LABEL} (${id})` : ANOTHER_PERSON_LABEL
	return { text, named: true, id, kind: "person" }
}
