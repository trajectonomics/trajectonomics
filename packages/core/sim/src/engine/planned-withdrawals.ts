import type { AccountId, DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { LevySet } from "./levy-set"
import { mutate } from "./mutate"
import { compareIds } from "./order"
import type { StateMap } from "./state"

/**
 * Raises each drawn liability by the planned withdrawal, in source id order, before the date's debt
 * payments are read: a same-date payment then sees the amount owed the draw created.
 */
export function applyPlannedWithdrawals(
	states: StateMap,
	plannedBySource: ReadonlyMap<AccountId, bigint>,
	date: DateString,
	levies: LevySet | undefined,
): ProjectionProblem | undefined {
	for (const source of [...plannedBySource.keys()].sort(compareIds)) {
		const problem = mutate(states.get(source)!, date, plannedBySource.get(source)!, levies)
		if (problem !== undefined) return problem
	}
	return undefined
}
