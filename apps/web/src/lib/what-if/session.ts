/**
 * The What-if session as data: the plan it belongs to, the content hash the page read for that plan, and
 * the Sets and Removals the person has made. Pure: a reducer per change, and the words that name each
 * change. Nothing here is stored; the client module holds the value for the length of the tab.
 */
import { type Addition, additionPath } from "./additions"
import type { Json, SetChange } from "./overrides"
import type { Group } from "./session-group"
import { triedItemSets, withoutItemChanges } from "./session-items"

export type WhatIf = {
	/** The plan the changes are made against. */
	plan: string
	/** The content hash the page read for the plan when the session began; an Edit names it (cli ADR 0055). */
	contentHash: string
	sets: SetChange[]
	removals: string[]
	/** The items the session puts on a list, which the plan does not hold (cli ADR 0062). */
	additions: Addition[]
	/** The loans and assets the session changes as a whole: their parts switch and try together (`session-group.ts`). */
	groups: Group[]
}

/** A session that has just begun on a plan: no change yet. */
export function startWhatIf(plan: string, contentHash: string): WhatIf {
	return { plan, contentHash, sets: [], removals: [], additions: [], groups: [] }
}

/** Whether the session holds any change. */
export function hasChanges(whatIf: WhatIf): boolean {
	return whatIf.sets.length + whatIf.removals.length + whatIf.additions.length > 0
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

/**
 * Switches an item off, with `also` the paths that go with it (a salary's employer share is a Flow of its own, which
 * `traj` refuses to leave reading a salary a Removal took out): a Removal of each. `traj` also refuses a Set of an
 * item a Removal took out (`No key or id`), and a Removal beside an Addition of the same id, so each item's Sets and
 * Addition are dropped. A form opened on it then starts from the plan's own values. Switching off an item already
 * off, and the paths with it, changes nothing.
 */
export function switchedOff(whatIf: WhatIf, path: string, also: readonly string[] = []): WhatIf {
	const gone = [path, ...also]
	if (gone.every((one) => isOff(whatIf, one))) return whatIf
	return {
		...whatIf,
		removals: [...whatIf.removals, ...gone.filter((one) => !whatIf.removals.includes(one))],
		sets: whatIf.sets.filter(
			(set) => !gone.some((one) => set.path === one || set.path.startsWith(`${one}.`)),
		),
		additions: whatIf.additions.filter((one) => !gone.includes(additionPath(one))),
	}
}

/** Switches an item back on: its Removal is dropped. */
export function switchedOn(whatIf: WhatIf, path: string): WhatIf {
	return { ...whatIf, removals: whatIf.removals.filter((removal) => removal !== path) }
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

/** The Overrides of a session in the order `traj` takes them: removals, Additions, then Sets (cli ADR 0056, 0062). */
export function overridesOf(whatIf: WhatIf): {
	sets: SetChange[]
	removals: string[]
	additions: Addition[]
} {
	return { sets: whatIf.sets, removals: whatIf.removals, additions: whatIf.additions }
}

export { type Change, changesOf, namesChange } from "./session-changes"
export {
	type Group,
	type GroupSpec,
	groupId,
	groupOf,
	isGroupOff,
	withGroupOff,
	withGroupTried,
	withoutGroup,
} from "./session-group"
export {
	clearedFields,
	itemSets,
	recordOf,
	triedItemSets,
	withAddition,
	withoutAddition,
	withoutItemChanges,
} from "./session-items"
