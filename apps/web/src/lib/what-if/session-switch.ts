import { additionPath } from "./additions"
import type { Json } from "./overrides"
import { isOff, type WhatIf, withSet } from "./session"
import { withoutGroup } from "./session-group"
import { triedItemSets, withoutItemChanges } from "./session-items"

/**
 * Switches an item off, with `also` the paths that go with it, such as a salary's employer share. A stored item gets a
 * Removal; an item the session adds is not in the plan, so a Removal of it would be refused (`No key or id`), and it
 * leaves the session with its Sets instead. Every other Set stays in the session, held back by `overridesOf` while the
 * item is off, so a switch back on brings the try back. Switching off an item already off changes nothing.
 */
export function switchedOff(whatIf: WhatIf, path: string, also: readonly string[] = []): WhatIf {
	const gone = [path, ...also]
	const added = new Set(whatIf.additions.map(additionPath))
	const leaving = gone.filter((one) => added.has(one))
	const removals = gone.filter((one) => !added.has(one) && !isOff(whatIf, one))
	if (removals.length === 0 && leaving.length === 0) return whatIf
	return {
		...whatIf,
		removals: [...whatIf.removals, ...removals],
		// A Flow that leaves the session cannot keep a Set: its id names nothing left in the plan.
		sets: whatIf.sets.filter(
			(set) => !leaving.some((one) => set.path === one || set.path.startsWith(`${one}.`)),
		),
		additions: whatIf.additions.filter((one) => !gone.includes(additionPath(one))),
	}
}

/** Switches an item back on: its Removal is dropped. */
export function switchedOn(whatIf: WhatIf, path: string): WhatIf {
	return { ...whatIf, removals: whatIf.removals.filter((removal) => removal !== path) }
}

/** Switches a salary and its employer share on together: the unit's group goes, and so does either Removal. */
export function switchedOnUnit(whatIf: WhatIf, salaryId: string, shareId: string): WhatIf {
	const id = `salary:${salaryId}`
	const base = withoutGroup(whatIf, id)
	return switchedOn(switchedOn(base, `flows.${salaryId}`), `flows.${shareId}`)
}

/**
 * The session with an item's changed fields tried, replacing any earlier try of it: one Set per changed field, or one
 * Set of the whole item when the try adds a field the stored item lacks (`triedItemSets`). A field the form cleared
 * is not tried here, and the form reports it (`TryNotice`); one Set of the whole item clears it, and the Edit that saves
 * the plan clears it too.
 */
export function withTriedFields(
	whatIf: WhatIf,
	list: string,
	id: string,
	stored: Record<string, Json>,
	edited: Record<string, Json>,
): WhatIf {
	const base = withoutItemChanges(whatIf, list, id)
	return triedItemSets(list, id, stored, edited).reduce(
		(one, set) => withSet(one, set.path, set.value),
		base,
	)
}
