import { type Addition, additionPath } from "./additions"
import type { Json, SetChange } from "./overrides"
import { sameJson } from "./same-json"
import type { WhatIf } from "./session"

/**
 * The Sets an edited item makes: one per field whose JSON value differs from the stored item (compared as data, not as text), at
 * `<list>.<id>.<field>`. A field the form removed is not a Set, because `traj` replaces a path and does not
 * delete one; such a change is left to the Edit that saves the document.
 */
export function itemSets(
	list: string,
	id: string,
	stored: Record<string, Json>,
	edited: Record<string, Json>,
): SetChange[] {
	return Object.keys(edited)
		.filter((field) => !sameJson(stored[field] ?? null, edited[field] ?? null))
		.map((field) => ({ path: `${list}.${id}.${field}`, value: edited[field] ?? null }))
}

/**
 * The Sets a try makes of an edited item: one per changed field, or one Set of the whole item when the try adds a
 * field the stored item lacks. `traj` sets a path the stored item has and refuses an absent one (`No key or id`), so
 * an open-ended Flow's first end or a first category is one Set of the whole Flow (cli ADR 0062, 0068).
 */
export function triedItemSets(
	list: string,
	id: string,
	stored: Record<string, Json>,
	edited: Record<string, Json>,
): SetChange[] {
	const changed = itemSets(list, id, stored, edited)
	const adds = Object.keys(edited).some((field) => !(field in stored))
	return adds && changed.length > 0 ? [{ path: `${list}.${id}`, value: edited }] : changed
}

/** The fields a form cleared: stored with a value, and absent from the edited item. A what-if cannot try them. */
export function clearedFields(
	stored: Record<string, Json>,
	edited: Record<string, Json>,
): string[] {
	return Object.keys(stored).filter(
		(field) => stored[field] !== null && edited[field] === undefined,
	)
}

/** An item of the plan as a JSON record, so a form's edited item and the stored one compare field by field. */
export function recordOf(item: object): Record<string, Json> {
	return JSON.parse(JSON.stringify(item)) as Record<string, Json>
}

/** Puts an item on a list in the session; an Addition of the same list and id is replaced, in its place. */
export function withAddition(whatIf: WhatIf, addition: Addition): WhatIf {
	const path = additionPath(addition)
	const exists = whatIf.additions.some((one) => additionPath(one) === path)
	const additions = exists
		? whatIf.additions.map((one) => (additionPath(one) === path ? addition : one))
		: [...whatIf.additions, addition]
	return { ...whatIf, additions }
}

/** Takes an Addition out of the session by its path (`flows.rmf-fund-rmf-2026`). */
export function withoutAddition(whatIf: WhatIf, path: string): WhatIf {
	return { ...whatIf, additions: whatIf.additions.filter((one) => additionPath(one) !== path) }
}

/**
 * The session without any earlier change to one item: its Removal, its Addition, its whole-item Set and its field Sets. A new try of the
 * item starts from the plan's own, so a later try replaces an earlier one and never meets it.
 */
export function withoutItemChanges(whatIf: WhatIf, list: string, id: string): WhatIf {
	const path = `${list}.${id}`
	return {
		...whatIf,
		removals: whatIf.removals.filter((removal) => removal !== path),
		additions: whatIf.additions.filter((one) => additionPath(one) !== path),
		sets: whatIf.sets.filter((set) => set.path !== path && !set.path.startsWith(`${path}.`)),
	}
}
