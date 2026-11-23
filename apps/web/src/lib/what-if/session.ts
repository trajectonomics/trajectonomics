/**
 * The What-if session as data: the plan it belongs to, the content hash the page read for that plan, and
 * the Sets and Removals the person has made. Pure: a reducer per change, and the words that name each
 * change. Nothing here is stored; the client module holds the value for the length of the tab.
 */
import type { Json, SetChange } from "./overrides"

export type WhatIf = {
	/** The plan the changes are made against. */
	plan: string
	/** The content hash the page read for the plan when the session began; an Edit names it (cli ADR 0055). */
	contentHash: string
	sets: SetChange[]
	removals: string[]
}

/** A session that has just begun on a plan: no change yet. */
export function startWhatIf(plan: string, contentHash: string): WhatIf {
	return { plan, contentHash, sets: [], removals: [] }
}

/** Whether the session holds any change. */
export function hasChanges(whatIf: WhatIf): boolean {
	return whatIf.sets.length > 0 || whatIf.removals.length > 0
}

/** Whether an item's path is switched off in the session. */
export function isOff(whatIf: WhatIf, path: string): boolean {
	return whatIf.removals.includes(path)
}

/** The value a Set of this path holds, or undefined when the session sets none. */
export function setOf(whatIf: WhatIf, path: string): SetChange | undefined {
	return whatIf.sets.find((set) => set.path === path)
}

/** Sets a path to a value, replacing an earlier Set of the same path. The order of the first Set stays. */
export function withSet(whatIf: WhatIf, path: string, value: Json): WhatIf {
	const next = { path, value }
	const exists = whatIf.sets.some((set) => set.path === path)
	const sets = exists
		? whatIf.sets.map((set) => (set.path === path ? next : set))
		: [...whatIf.sets, next]
	return { ...whatIf, sets }
}

/** Drops the Set of a path, so the item reads as the plan stores it. */
export function withoutSet(whatIf: WhatIf, path: string): WhatIf {
	return { ...whatIf, sets: whatIf.sets.filter((set) => set.path !== path) }
}

/** Switches an item off: a Removal of its id. Switching off an item already off changes nothing. */
export function switchedOff(whatIf: WhatIf, path: string): WhatIf {
	return isOff(whatIf, path) ? whatIf : { ...whatIf, removals: [...whatIf.removals, path] }
}

/** Switches an item back on: its Removal is dropped. */
export function switchedOn(whatIf: WhatIf, path: string): WhatIf {
	return { ...whatIf, removals: whatIf.removals.filter((removal) => removal !== path) }
}

/**
 * The Sets an edited item makes: one per field whose JSON value differs from the stored item, at
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
		.filter(
			(field) => JSON.stringify(stored[field] ?? null) !== JSON.stringify(edited[field] ?? null),
		)
		.map((field) => ({ path: `${list}.${id}.${field}`, value: edited[field] ?? null }))
}

/** One change of the session, as the bar lists it: a switch off, or a Set with its value as typed. */
export type Change =
	| { kind: "off"; path: string; label: string }
	| { kind: "set"; path: string; label: string; value: string }

/** The item name a path names: `flows.gym.amount` names `gym`, shown as `Gym`. */
function itemLabel(path: string): string {
	const id = path.split(".")[1] ?? path
	return id.charAt(0).toUpperCase() + id.slice(1)
}

/** The value of a Set as the bar shows it: a decimal string or a number, as the person typed it. */
function valueText(value: Json): string {
	if (typeof value === "string") return value
	return JSON.stringify(value)
}

/** The changes, in the order the session holds them: removals first, then Sets. */
export function changesOf(whatIf: WhatIf): Change[] {
	const removals = whatIf.removals.map(
		(path): Change => ({
			kind: "off",
			path,
			label: `${itemLabel(path)} switched off`,
		}),
	)
	const sets = whatIf.sets.map((set): Change => {
		const field = set.path.split(".").slice(2).join(".")
		return {
			kind: "set",
			path: set.path,
			label: `${itemLabel(set.path)} ${field} set to ${valueText(set.value)}`,
			value: valueText(set.value),
		}
	})
	return [...removals, ...sets]
}

/** The Overrides of a session in the order `traj` takes them: removals, then Sets (cli ADR 0056). */
export function overridesOf(whatIf: WhatIf): { sets: SetChange[]; removals: string[] } {
	return { sets: whatIf.sets, removals: whatIf.removals }
}

/** An item of the plan as a JSON record, so a form's edited item and the stored one compare field by field. */
export function recordOf(item: object): Record<string, Json> {
	return JSON.parse(JSON.stringify(item)) as Record<string, Json>
}
