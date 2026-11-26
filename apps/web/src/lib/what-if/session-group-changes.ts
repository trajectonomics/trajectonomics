import type { WhatIf } from "./session"
import type { Change } from "./session-changes"
import { groupId, inGroup } from "./session-group"

/** Whether a refusal that names this path (`details.path`) is about the change: its own path, or a part of its group. */
export function namesChange(change: Change, path: string): boolean {
	if (change.kind === "group") return inGroup({ paths: change.parts }, path) || change.path === path
	return change.path === path
}

/** One change per group, worded by how the group was changed. */
export function groupChanges(whatIf: WhatIf): Change[] {
	return whatIf.groups.map((group): Change => {
		const how = group.how === "off" ? "switched off" : "tried as edited"
		const name = group.name.charAt(0).toUpperCase() + group.name.slice(1)
		const label =
			group.kind === "salary"
				? `${name} and its employer share ${how}`
				: `${group.kind === "loan" ? "Loan" : "Asset"} ${group.name} ${how}`
		return { kind: "group", path: groupId(group), label, parts: group.paths }
	})
}
