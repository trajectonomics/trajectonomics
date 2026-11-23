/**
 * The What-if session as data: the plan it belongs to, the content hash the page read for that plan, and
 * the Sets and Removals the person has made. Pure: a reducer per change, and the words that name each
 * change. Nothing here is stored; the client module holds the value for the length of the tab.
 */
import type { Addition } from "./additions"
import type { Json, SetChange } from "./overrides"

export type WhatIf = {
	/** The plan the changes are made against. */
	plan: string
	/** The content hash the page read for the plan when the session began; an Edit names it (cli ADR 0055). */
	contentHash: string
	sets: SetChange[]
	removals: string[]
	/** The items the session puts on a list, which the plan does not hold (cli ADR 0062). */
	additions: Addition[]
}

/** A session that has just begun on a plan: no change yet. */
export function startWhatIf(plan: string, contentHash: string): WhatIf {
	return { plan, contentHash, sets: [], removals: [], additions: [] }
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

/** Switches an item off: a Removal of its id. Switching off an item already off changes nothing. */
export function switchedOff(whatIf: WhatIf, path: string): WhatIf {
	return isOff(whatIf, path) ? whatIf : { ...whatIf, removals: [...whatIf.removals, path] }
}

/** Switches an item back on: its Removal is dropped. */
export function switchedOn(whatIf: WhatIf, path: string): WhatIf {
	return { ...whatIf, removals: whatIf.removals.filter((removal) => removal !== path) }
}

/** The Overrides of a session in the order `traj` takes them: removals, Additions, then Sets (cli ADR 0056, 0062). */
export function overridesOf(whatIf: WhatIf): {
	sets: SetChange[]
	removals: string[]
	additions: Addition[]
} {
	return { sets: whatIf.sets, removals: whatIf.removals, additions: whatIf.additions }
}

export { type Change, changesOf } from "./session-changes"
export {
	clearedFields,
	itemSets,
	recordOf,
	withAddition,
	withoutAddition,
	withoutItemChanges,
} from "./session-items"
