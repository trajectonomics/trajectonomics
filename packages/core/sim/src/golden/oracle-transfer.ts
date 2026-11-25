import type { DateString } from "../types"
import type { OracleEvent } from "./oracle-flow"
import type { PlannedDay } from "./oracle-planned"
import { type OracleState, type OracleStates, oracleMutate, oracleValuation } from "./oracle-state"

/** What a day's transfers moved and could not move, by Flow id; only the nonzero. */
export interface OracleMoved {
	readonly moved: ReadonlyMap<string, bigint>
	readonly unmoved: ReadonlyMap<string, bigint>
}

function least(left: bigint, right: bigint): bigint {
	return left < right ? left : right
}

function put(map: Map<string, bigint>, key: string, amount: bigint): void {
	if (amount !== 0n) map.set(key, (map.get(key) ?? 0n) + amount)
}

/** What one transfer can move: the planned amount, no more than the source holds (none while locked) or the loan owes. */
function oracleLimit(from: OracleState, to: OracleState, want: bigint, date: DateString): bigint {
	const { rule } = from
	const locked = rule.kind === "asset" && rule.lockedUntil !== undefined && date < rule.lockedUntil
	const held = locked ? 0n : oracleValuation(from, date)
	const room = to.rule.kind === "liability" ? oracleValuation(to, date) : held
	return least(want, least(held, room))
}

/**
 * Lands the day's transfers one after the other, in the order the Scenario lists their Flows (the oracle's
 * events come in Flow order), each reading the Accounts as the one before left them. A liability target
 * owes less, an asset target holds more. Written from the plain Scenario fields.
 */
export function oracleTransfers(
	states: OracleStates,
	landing: readonly OracleEvent[],
	planned: PlannedDay,
	date: DateString,
): OracleMoved {
	const moved = new Map<string, bigint>()
	const unmoved = new Map<string, bigint>()
	for (const { flow } of landing) {
		if (flow.kind !== "transfer") continue
		const [from, to] = [states.get(flow.source)!, states.get(flow.target)!]
		const want = planned.get(flow.id) ?? 0n
		const take = oracleLimit(from, to, want, date)
		if (take > 0n) {
			oracleMutate(from, date, -take)
			oracleMutate(to, date, to.rule.kind === "liability" ? -take : take)
		}
		put(moved, flow.id, take)
		put(unmoved, flow.id, want - take)
	}
	return { moved, unmoved }
}
