/**
 * What the session sends to `traj`: its Sets, Removals and Additions in the order `traj` takes them (cli ADR 0056,
 * 0062). A change held back by a switch stays in the session, so switching the item on brings it back, but it is not
 * sent while the item is off: `traj` refuses a Set of an item a Removal took out, and a Removal of an item that only
 * the session adds. Pure.
 */
import { type Addition, additionPath } from "./additions"
import type { SetChange } from "./overrides"
import type { WhatIf } from "./session"
import { inGroup } from "./session-group"

/** Whether a change of this path is held back: the item is off, or a loan, an asset or a salary is switched off as one. */
export function isHeld(whatIf: WhatIf, path: string): boolean {
	return (
		whatIf.removals.some((one) => path === one || path.startsWith(`${one}.`)) ||
		whatIf.groups.some((group) => group.how === "off" && inGroup(group, path))
	)
}

/** The Overrides of a session in the order `traj` takes them: removals, Additions, then Sets (cli ADR 0056, 0062). */
export function overridesOf(whatIf: WhatIf): {
	sets: SetChange[]
	removals: string[]
	additions: Addition[]
} {
	const added = new Set(whatIf.additions.map(additionPath))
	return {
		sets: whatIf.sets.filter((set) => !isHeld(whatIf, set.path)),
		// A Removal of an item the session adds names nothing in the plan: the Addition is what makes it.
		removals: whatIf.removals.filter((path) => !added.has(path)),
		additions: whatIf.additions.filter((one) => !isHeld(whatIf, additionPath(one))),
	}
}
