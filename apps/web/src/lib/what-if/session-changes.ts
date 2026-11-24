/** The changes of a session as the bar lists them, in the order `traj` applies them. Pure. */
import { additionId, additionPath, additionWords } from "./additions"
import type { Json } from "./overrides"
import type { WhatIf } from "./session"
import { groupId, inGroup } from "./session-group"

/** One change of the session, as the bar lists it: a switch off, or a Set with its value as typed. */
export type Change =
	| { kind: "off"; path: string; label: string }
	| { kind: "add"; path: string; label: string; title: string }
	| { kind: "set"; path: string; label: string; value: string }
	/** A Set of a whole Flow (`flows.rent`) or of its rule (`flows.rent.rule`): worded without its JSON, and without a figure. */
	| { kind: "flow"; path: string; label: string; value: Json }
	/** A Set of the whole estate block: worded without its lines, which hold the person's own shares and amounts. */
	| { kind: "estate"; path: string; label: string }
	/** A loan or an asset changed as a whole: its parts' Sets or Removals, worded as one change whose `path` is the group's id. */
	| { kind: "group"; path: string; label: string; parts: readonly string[] }

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

/** Whether a Set's path names a whole Flow (`flows.rent`) or a Flow's rule (`flows.rent.rule`). */
function isFlowTry(path: string): boolean {
	const parts = path.split(".")
	return parts[0] === "flows" && (parts.length === 2 || (parts.length === 3 && parts[2] === "rule"))
}

/** Whether a refusal that names this path (`details.path`) is about the change: its own path, or a part of its group. */
export function namesChange(change: Change, path: string): boolean {
	if (change.kind === "group") return inGroup({ paths: change.parts }, path) || change.path === path
	return change.path === path
}

/** One change per group, worded by how the group was changed. */
function groupChanges(whatIf: WhatIf): Change[] {
	return whatIf.groups.map((group): Change => {
		const noun = group.kind === "loan" ? "Loan" : "Asset"
		const how = group.how === "off" ? "switched off" : "tried as edited"
		return {
			kind: "group",
			path: groupId(group),
			label: `${noun} ${group.name} ${how}`,
			parts: group.paths,
		}
	})
}

/** The changes, in the order `traj` applies them: removals first, then Additions, then Sets, and each group as one. */
export function changesOf(whatIf: WhatIf): Change[] {
	const own = (path: string) => !whatIf.groups.some((group) => inGroup(group, path))
	const removals = whatIf.removals.filter(own).map(
		(path): Change => ({
			kind: "off",
			path,
			label: `${itemLabel(path)} switched off`,
		}),
	)
	const additions = whatIf.additions
		.filter((one) => own(additionPath(one)))
		.map(
			(one): Change => ({
				kind: "add",
				path: additionPath(one),
				label: additionWords(one),
				title: `Added ${one.list.replace(/s$/, "")} ${additionId(one)}`,
			}),
		)
	const sets = whatIf.sets
		.filter((set) => own(set.path))
		.map((set): Change => {
			if (set.path === "estate")
				return { kind: "estate", path: set.path, label: "Estate lines tried as edited" }
			if (isFlowTry(set.path)) {
				const what = set.path.endsWith(".rule") ? "spending rule changed" : "tried as edited"
				return {
					kind: "flow",
					path: set.path,
					label: `${itemLabel(set.path)} ${what}`,
					value: set.value,
				}
			}
			const field = set.path.split(".").slice(2).join(".")
			return {
				kind: "set",
				path: set.path,
				label: `${itemLabel(set.path)} ${field} set to ${valueText(set.value)}`,
				value: valueText(set.value),
			}
		})
	return [...removals, ...additions, ...sets, ...groupChanges(whatIf)]
}
