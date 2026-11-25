import type { Json } from "./json"
import {
	clearedFields,
	itemSets,
	type WhatIf,
	withAddition,
	withoutItemChanges,
	withSet,
} from "./session"

/** One item a what-if tries: as the plan stores it (absent when new) and as the form made it. */
export interface TriedFlow {
	readonly stored: Record<string, Json> | undefined
	readonly edited: Record<string, Json> & { id: string }
}

/**
 * The session with an item of a list tried in it, replacing any earlier try of that item. An item the plan does not hold is an
 * Addition. An edited one is a Set of each changed field, unless a Set cannot make the change (a field the form
 * removed, or one the stored item did not have, such as an Account's first `fee`): then it is one Set of the whole
 * item, `<list>.<id>` to the edited item, which `traj` takes in place of the stored one and checks like any other plan (cli
 * ADR 0062). A Removal and an Addition of the same id would be refused, so the pair is never made.
 */
export function withTriedItem(
	whatIf: WhatIf,
	list: "flows" | "accounts",
	{ stored, edited }: TriedFlow,
): WhatIf {
	const base = withoutItemChanges(whatIf, list, edited.id)
	if (stored === undefined) return withAddition(base, { list, item: edited })
	const fieldSets =
		clearedFields(stored, edited).length === 0 &&
		Object.keys(edited).every((field) => field in stored)
	if (fieldSets)
		return itemSets(list, edited.id, stored, edited).reduce(
			(one, set) => withSet(one, set.path, set.value),
			base,
		)
	return withSet(base, `${list}.${edited.id}`, edited)
}

/** The session with a Flow tried in it (`withTriedItem`). */
export function withTriedFlow(whatIf: WhatIf, tried: TriedFlow): WhatIf {
	return withTriedItem(whatIf, "flows", tried)
}
