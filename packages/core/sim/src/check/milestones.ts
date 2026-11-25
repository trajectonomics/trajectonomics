import { MILESTONE_COMBINES } from "../vocab"
import type { AccountIndex, Check, Emit, Path } from "./codes"
import { displayLabel } from "./display-label"
import { criterionCheck } from "./milestone-criterion"
import { checkMilestoneGraph } from "./milestone-graph"
import { oneOf, str } from "./scalars"
import { checkShape, checkUnique, list, opt, req } from "./shape"

/** A Milestone's criteria: a non-empty list with unique ids, like a Scenario's Levies. */
function criteriaCheck(accounts: AccountIndex | undefined): Check {
	const criterion = list(criterionCheck(accounts))
	return (value, path, emit) => {
		if (Array.isArray(value) && value.length === 0) return emit("MISSING_KEY", path)
		criterion(value, path, emit)
		checkUnique(value, path, "id", emit)
	}
}

function milestoneCheck(accounts: AccountIndex | undefined): Check {
	return (value, path, emit) => {
		checkShape(
			value,
			path,
			{
				id: req(str),
				displayLabel: opt(displayLabel),
				combine: req(oneOf(MILESTONE_COMBINES, "INVALID_COMBINE")),
				criteria: req(criteriaCheck(accounts)),
			},
			emit,
		)
	}
}

/** The optional `milestones` list: a non-empty array of Milestones with unique ids and a valid graph. */
export function checkMilestones(
	value: unknown,
	path: Path,
	accounts: AccountIndex | undefined,
	emit: Emit,
): void {
	if (Array.isArray(value) && value.length === 0) {
		emit("MISSING_KEY", path)
		return
	}
	list(milestoneCheck(accounts))(value, path, emit)
	checkUnique(value, path, "id", emit)
	if (Array.isArray(value)) checkMilestoneGraph(value, path, emit)
}
