import { additionPath } from "./additions"
import type { Json } from "./overrides"
import { isOff, type WhatIf, withSet } from "./session"
import { withoutGroup } from "./session-group"
import { triedItemSets, withoutItemChanges } from "./session-items"

/**
 * Switches an item off: a stored item gets a Removal, while an item the session adds is not in the plan, so a Removal
 * of it would be refused (`No key or id`), and it leaves the session with its Sets instead. Every other Set stays in
 * the session, held back by `overridesOf` while the item is off, so a switch back on brings the try back. Switching
 * off an item already off changes nothing. A salary and its employer share switch as a group (`withGroupOff`).
 */
export function switchedOff(whatIf: WhatIf, path: string): WhatIf {
	const added = whatIf.additions.some((one) => additionPath(one) === path)
	if (added) {
		return {
			...whatIf,
			// A Flow that leaves the session cannot keep a Set: its id names nothing left in the plan.
			sets: whatIf.sets.filter((set) => !(set.path === path || set.path.startsWith(`${path}.`))),
			additions: whatIf.additions.filter((one) => additionPath(one) !== path),
		}
	}
	if (isOff(whatIf, path)) return whatIf
	return { ...whatIf, removals: [...whatIf.removals, path] }
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
