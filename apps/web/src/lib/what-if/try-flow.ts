import type { Json } from "./json"
import {
	clearedFields,
	itemSets,
	switchedOff,
	type WhatIf,
	withAddition,
	withoutItemChanges,
	withSet,
} from "./session"

/** One Flow a what-if tries: as the plan stores it (absent when new) and as the form made it. */
export interface TriedFlow {
	readonly stored: Record<string, Json> | undefined
	readonly edited: Record<string, Json> & { id: string }
}

/**
 * The session with a Flow tried in it, replacing any earlier try of that Flow. A Flow the plan does not hold is an
 * Addition. An edited one is a Set of each changed field, unless a Set cannot make the change (a field the form
 * removed, or one the stored Flow did not have): then it is a Removal of the stored Flow and an Addition of the
 * edited one under the same id, which `traj` applies in that order (cli ADR 0062).
 */
export function withTriedFlow(whatIf: WhatIf, { stored, edited }: TriedFlow): WhatIf {
	const base = withoutItemChanges(whatIf, "flows", edited.id)
	if (stored === undefined) return withAddition(base, { list: "flows", item: edited })
	const sets =
		clearedFields(stored, edited).length === 0 &&
		Object.keys(edited).every((field) => field in stored)
	if (sets)
		return itemSets("flows", edited.id, stored, edited).reduce(
			(one, set) => withSet(one, set.path, set.value),
			base,
		)
	return withAddition(switchedOff(base, `flows.${edited.id}`), { list: "flows", item: edited })
}
