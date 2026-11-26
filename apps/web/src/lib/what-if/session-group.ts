/**
 * A loan's, a real asset's or a salary's changes as one group in the What-if session. A loan is an Account and the
 * Flows that borrow and repay it, an asset is its Account, its loan and its Flows (cli ADR 0059, 0060), and a salary
 * is its Flow and the employer share beside it: a change to one part alone leaves the plan inconsistent (a loan that
 * is never repaid, a share whose salary is gone), so the session makes and takes back the parts together. Pure: a
 * reducer per change.
 */
import { additionPath } from "./additions"
import type { Json } from "./overrides"
import type { WhatIf } from "./session"

/** How a group is changed in the session: its parts switched off together, or tried as edited together. */
export type GroupHow = "off" | "tried"

/** What a group is: a loan, an asset or a salary, its name, and the `<list>.<id>` path of each of its parts. */
export type GroupSpec = {
	readonly kind: "loan" | "asset" | "salary"
	readonly name: string
	readonly paths: readonly string[]
}

/** A group the session holds. `held` are the Removals its switch found in place, which a switch back on keeps. */
export type Group = GroupSpec & { readonly how: GroupHow; readonly held: readonly string[] }

/** The id of a group, which is also the `path` of the change that lists it. */
export function groupId(spec: Pick<GroupSpec, "kind" | "name">): string {
	return `${spec.kind}:${spec.name}`
}

/** Whether a change's path is a part of the group, or a field of one. */
export function inGroup(group: Pick<GroupSpec, "paths">, path: string): boolean {
	return group.paths.some((part) => path === part || path.startsWith(`${part}.`))
}

/** The group the session holds under this id, if any. */
export function groupOf(whatIf: WhatIf, id: string): Group | undefined {
	return whatIf.groups.find((group) => groupId(group) === id)
}

/** Whether the group's parts are switched off in the session. */
export function isGroupOff(whatIf: WhatIf, id: string): boolean {
	return groupOf(whatIf, id)?.how === "off"
}

/**
 * The session without the group: its record and every Removal, Addition and Set of its parts. A salary's try, added
 * share and Removal made before its switch come back with it: the switch held them rather than taking them out of the
 * session, so a share a try cleared stays cleared when the salary switches back on. A switch off cleared every Set of
 * its parts, so a Set that remains under a switched-off group was made while it was off, on a part the plan keeps
 * declared (the Account a Baseline row holds), and is sent: it stays when the group comes back.
 */
export function withoutGroup(whatIf: WhatIf, id: string): WhatIf {
	const group = groupOf(whatIf, id)
	if (group === undefined) return whatIf
	const salary = group.kind === "salary"
	const keepSets = salary || group.how === "off"
	return {
		...whatIf,
		groups: whatIf.groups.filter((one) => one !== group),
		removals: whatIf.removals.filter(
			(path) => !inGroup(group, path) || (salary && group.held.includes(path)),
		),
		additions: salary
			? whatIf.additions
			: whatIf.additions.filter((one) => !inGroup(group, additionPath(one))),
		sets: keepSets ? whatIf.sets : whatIf.sets.filter((set) => !inGroup(group, set.path)),
	}
}

/** Whether two groups claim a path in common, a field of a part counting as the part. */
function overlap(a: Pick<GroupSpec, "paths">, b: Pick<GroupSpec, "paths">): boolean {
	return a.paths.some((path) => inGroup(b, path)) || b.paths.some((path) => inGroup(a, path))
}

/**
 * The session with the paths of `spec` handed to a new group: every group that claims one of them goes, whole, and
 * so does every Removal, Addition and Set under the paths of those groups and of `spec`, an independent Set made
 * before the group included. A path belongs to at most one group, so taking one group back never undoes part of
 * another, and a Set of a part that a switch takes out is never left to be refused. A salary's own changes are `keep`t:
 * the switch holds them for a later switch on (`overridesOf`).
 */
function takenOver(whatIf: WhatIf, spec: GroupSpec, keep: boolean): WhatIf {
	const gone = whatIf.groups.filter((one) => groupId(one) === groupId(spec) || overlap(one, spec))
	const owned = (path: string) =>
		gone.some((one) => inGroup(one, path)) || (!keep && inGroup(spec, path))
	return {
		...whatIf,
		groups: whatIf.groups.filter((one) => !gone.includes(one)),
		removals: whatIf.removals.filter((path) => !owned(path)),
		additions: whatIf.additions.filter((one) => !owned(additionPath(one))),
		sets: whatIf.sets.filter((set) => !owned(set.path)),
	}
}

/** The Removals already in place under the group's paths, which only a salary's switch holds rather than makes. */
function heldRemovals(whatIf: WhatIf, spec: GroupSpec): readonly string[] {
	if (spec.kind !== "salary") return []
	const existing = groupOf(whatIf, groupId(spec))
	if (existing !== undefined) return existing.held
	return whatIf.removals.filter((path) => inGroup(spec, path))
}

/**
 * The session with the group switched off: `removals` take its parts out together, and any earlier try or switch of
 * the group, of a group that shares a part with it and of a part alone is dropped, because a Set of a part that is
 * gone would be refused. A plan can keep a part declared (the Account a Baseline row holds), so the removals are
 * the caller's, and `spec.paths` are all the group's parts. A salary's try is held, so a switch back on restores it,
 * and so is a Removal it found in place (a share a try cleared), so that switch back on keeps the share out.
 */
export function withGroupOff(whatIf: WhatIf, spec: GroupSpec, removals: readonly string[]): WhatIf {
	const held = heldRemovals(whatIf, spec)
	const base = takenOver(whatIf, spec, spec.kind === "salary")
	return {
		...base,
		removals: [...base.removals, ...removals.filter((path) => !base.removals.includes(path))],
		groups: [...base.groups, { ...spec, how: "off", held }],
	}
}

/**
 * The session with the group tried: `sets` are the edited fields of its parts, and they replace any earlier try
 * or switch of the group or of a group that shares a part with it. No Set leaves the group as the plan stores it.
 */
export function withGroupTried(
	whatIf: WhatIf,
	spec: GroupSpec,
	sets: readonly { path: string; value: Json }[],
): WhatIf {
	const base = takenOver(whatIf, spec, false)
	if (sets.length === 0) return base
	return {
		...base,
		sets: [...base.sets, ...sets.filter((set) => !base.sets.some((one) => one.path === set.path))],
		groups: [...base.groups, { ...spec, how: "tried", held: [] }],
	}
}
