import type { AccountId, DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { LevySet } from "./levy-set"
import { minBigInt } from "./min"
import { mutate } from "./mutate"
import { compareIds } from "./order"
import type { AccountState, StateMap } from "./state"
import { valuation } from "./value"
import { isLocked } from "./withdraw"

/** What a date's planned withdrawals did: the cash that joined cashflow, and from where. */
export interface PlannedMoves {
	/** Borrowed plus sold, in minor units: cash that joins the net and never Available cashflow. */
	readonly cash: bigint
	/** The amount each liability grew by; only the nonzero ones. */
	readonly borrowedBy: ReadonlyMap<AccountId, bigint>
	/** The amount each asset gave up, `min(planned, value)`, nothing while it is locked; only the nonzero ones. */
	readonly soldBy: ReadonlyMap<AccountId, bigint>
	readonly problem: ProjectionProblem | undefined
}

interface Move {
	readonly moved: bigint
	readonly asset: boolean
	readonly problem: ProjectionProblem | undefined
}

/** One source: a liability's amount owed grows by `planned`; an asset gives up what a sale can take. */
function moveSource(
	state: AccountState,
	planned: bigint,
	date: DateString,
	levies: LevySet | undefined,
): Move {
	const asset = state.rule.kind === "asset"
	const moved = asset ? soldFrom(state, planned, date) : planned
	if (moved === 0n) return { moved, asset, problem: undefined }
	return { moved, asset, problem: mutate(state, date, asset ? -moved : moved, levies) }
}

/** The amount an asset gives up to a sale: all it holds, up to the planned amount, none while locked. */
function soldFrom(state: AccountState, planned: bigint, date: DateString): bigint {
	return isLocked(state, date) ? 0n : minBigInt(planned, valuation(state, date))
}

/**
 * Moves each source in id order, before the date's debt payments are read: a liability's amount
 * owed grows by the planned amount, so a same-date payment sees it; an asset gives up what it can.
 */
export function applyPlannedWithdrawals(
	states: StateMap,
	plannedBySource: ReadonlyMap<AccountId, bigint>,
	date: DateString,
	levies: LevySet | undefined,
): PlannedMoves {
	const borrowedBy = new Map<AccountId, bigint>()
	const soldBy = new Map<AccountId, bigint>()
	let cash = 0n
	for (const source of [...plannedBySource.keys()].sort(compareIds)) {
		const move = moveSource(states.get(source)!, plannedBySource.get(source)!, date, levies)
		if (move.problem !== undefined) return { cash, borrowedBy, soldBy, problem: move.problem }
		cash += move.moved
		if (move.moved > 0n) (move.asset ? soldBy : borrowedBy).set(source, move.moved)
	}
	return { cash, borrowedBy, soldBy, problem: undefined }
}
