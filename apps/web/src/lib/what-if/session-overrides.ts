/**
 * What the session sends to `traj`: its Sets, Removals and Additions in the order `traj` takes them (cli ADR 0056,
 * 0062). A change held back by a switch stays in the session, so switching the item on brings it back, but it is not
 * sent while the item is off: `traj` refuses a Set of an item a Removal took out, and a Removal of an item that only
 * the session adds. Pure.
 */
import { type Addition, additionPath } from "./additions"
import type { SetChange } from "./overrides"
import type { WhatIf } from "./session"

/**
 * Whether a change of this path is held back: a Removal takes the item out, so `traj` would refuse a Set of it. A part
 * a switched-off group keeps declared (the Account a Baseline row holds) has no Removal, so its Set is still sent.
 */
export function isHeld(whatIf: WhatIf, path: string): boolean {
	return whatIf.removals.some((one) => path === one || path.startsWith(`${one}.`))
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
