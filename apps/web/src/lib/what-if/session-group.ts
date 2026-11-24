/**
 * A loan's or a real asset's changes as one group in the What-if session. A loan is an Account and the Flows that
 * borrow and repay it, an asset is its Account, its loan and its Flows (cli ADR 0059, 0060): a change to one part
 * alone leaves the plan inconsistent (a loan that is never repaid, a draw with no purchase), so the session makes
 * and takes back the parts together. Pure: a reducer per change.
 */
import { additionPath } from "./additions"
import type { Json } from "./overrides"
import type { WhatIf } from "./session"

/** How a group is changed in the session: its parts switched off together, or tried as edited together. */
export type GroupHow = "off" | "tried"

/** What a group is: a loan or an asset, its name, and the `<list>.<id>` path of each of its parts. */
export type GroupSpec = {
	readonly kind: "loan" | "asset"
	readonly name: string
	readonly paths: readonly string[]
}

/** A group the session holds. */
export type Group = GroupSpec & { readonly how: GroupHow }

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

/** The session without the group: its record and every Removal, Addition and Set of its parts. */
export function withoutGroup(whatIf: WhatIf, id: string): WhatIf {
	const group = groupOf(whatIf, id)
	if (group === undefined) return whatIf
	return {
		...whatIf,
		groups: whatIf.groups.filter((one) => one !== group),
		removals: whatIf.removals.filter((path) => !inGroup(group, path)),
		additions: whatIf.additions.filter((one) => !inGroup(group, additionPath(one))),
		sets: whatIf.sets.filter((set) => !inGroup(group, set.path)),
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
 * another, and a Set of a part that a switch takes out is never left to be refused.
 */
function takenOver(whatIf: WhatIf, spec: GroupSpec): WhatIf {
	const gone = whatIf.groups.filter((one) => groupId(one) === groupId(spec) || overlap(one, spec))
	const owners = [...gone, spec]
	const owned = (path: string) => owners.some((one) => inGroup(one, path))
	return {
		...whatIf,
		groups: whatIf.groups.filter((one) => !gone.includes(one)),
		removals: whatIf.removals.filter((path) => !owned(path)),
		additions: whatIf.additions.filter((one) => !owned(additionPath(one))),
		sets: whatIf.sets.filter((set) => !owned(set.path)),
	}
}

/**
 * The session with the group switched off: `removals` take its parts out together, and any earlier try or switch of
 * the group, of a group that shares a part with it and of a part alone is dropped, because a Set of a part that is
 * gone would be refused. A plan can keep a part declared (the Account a Baseline row holds), so the removals are
 * the caller's, and `spec.paths` are all the group's parts.
 */
export function withGroupOff(whatIf: WhatIf, spec: GroupSpec, removals: readonly string[]): WhatIf {
	const base = takenOver(whatIf, spec)
	return {
		...base,
		removals: [...base.removals, ...removals.filter((path) => !base.removals.includes(path))],
		groups: [...base.groups, { ...spec, how: "off" }],
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
	const base = takenOver(whatIf, spec)
	if (sets.length === 0) return base
	return {
		...base,
		sets: [...base.sets, ...sets.filter((set) => !base.sets.some((one) => one.path === set.path))],
		groups: [...base.groups, { ...spec, how: "tried" }],
	}
}
