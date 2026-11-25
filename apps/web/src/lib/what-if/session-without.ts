import { switchedOn, type WhatIf, withoutAddition, withoutGroup, withoutSet } from "./session"
import type { Change } from "./session-changes"

/** The session without one change: a switch back on, an item not added, a group back as stored, or a value back to the plan's. */
export function withoutChange(whatIf: WhatIf, change: Change): WhatIf {
	if (change.kind === "off") return switchedOn(whatIf, change.path)
	if (change.kind === "add") return withoutAddition(whatIf, change.path)
	if (change.kind === "group") return withoutGroup(whatIf, change.path)
	return withoutSet(whatIf, change.path)
}
