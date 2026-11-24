import type { Check } from "./codes"
import type { FlowContext } from "./flow-shape"
import { opt, type Shape } from "./shape"

/** A Milestone id a Flow gates on: a string that names a declared Milestone. */
export function milestoneRef(ids: ReadonlySet<string>): Check {
	return (value, path, emit) => {
		if (typeof value !== "string") emit("WRONG_TYPE", path)
		else if (!ids.has(value)) emit("UNKNOWN_MILESTONE", path)
	}
}

export function gates(context: FlowContext): Shape {
	const ref = milestoneRef(context.milestoneIds)
	return { startAt: opt(ref), endAt: opt(ref) }
}
