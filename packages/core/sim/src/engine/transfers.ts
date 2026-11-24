import type { AccountId, DateString, Scenario } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { addTo } from "./add"
import type { LevySet } from "./levy-set"
import { minBigInt } from "./min"
import type { DayTotals } from "./occurrence"
import type { StateMap } from "./state"
import type { TransferEntry } from "./transfer-entry"
import { moveMoney } from "./transfer-move"
import { valuation } from "./value"
import { isLocked } from "./withdraw"

/** What a date's transfers did, by Flow id: the money moved, and the planned money that could not move. */
export interface Moved {
	readonly total: bigint
	/** Moved per Flow id; only the nonzero ones. */
	readonly by: ReadonlyMap<string, bigint>
	/** Planned but not moved per Flow id (the source held less, was locked, or the loan owed less); only the nonzero ones. */
	readonly unmoved: ReadonlyMap<string, bigint>
	/** Moved into each liability, only the nonzero ones. */
	readonly into: ReadonlyMap<AccountId, bigint>
	readonly problem: ProjectionProblem | undefined
}

export const NO_TRANSFERS: Moved = {
	total: 0n,
	by: new Map(),
	unmoved: new Map(),
	into: new Map(),
	problem: undefined,
}

/** What one transfer can move: the planned amount, no more than the source holds (none while locked) or the loan owes. */
function limit(entry: TransferEntry, states: StateMap, date: DateString): bigint {
	const from = states.get(entry.source)!
	const to = states.get(entry.target)!
	const held = isLocked(from, date) ? 0n : valuation(from, date)
	const room = to.rule.kind === "liability" ? valuation(to, date) : held
	return minBigInt(entry.amount, minBigInt(held, room))
}

/** The entries in Scenario order, so two transfers of one date apply as the plan lists them. */
function inScenarioOrder(entries: readonly TransferEntry[], scenario: Scenario) {
	const at = new Map(scenario.flows.map((flow, index) => [flow.id, index] as const))
	return [...entries].sort((a, b) => at.get(a.flow)! - at.get(b.flow)!)
}

interface Tally {
	total: bigint
	readonly by: Map<string, bigint>
	readonly unmoved: Map<string, bigint>
	readonly into: Map<AccountId, bigint>
}

/** Moves one transfer by what it can, and books what moved and what could not. */
function land(
	states: StateMap,
	entry: TransferEntry,
	date: DateString,
	levies: LevySet | undefined,
	tally: Tally,
): ProjectionProblem | undefined {
	const amount = limit(entry, states, date)
	if (entry.amount > amount) addTo(tally.unmoved, entry.flow, entry.amount - amount)
	if (amount === 0n) return undefined
	const [from, to] = [states.get(entry.source)!, states.get(entry.target)!]
	const problem = moveMoney(from, to, amount, date, levies, entry.realise)
	if (problem !== undefined) return problem
	tally.total += amount
	addTo(tally.by, entry.flow, amount)
	if (to.rule.kind === "liability") addTo(tally.into, entry.target, amount)
	return undefined
}

/**
 * Moves each transfer of the date in Scenario order, after the date's income, expenses and
 * contributions and before its surplus and `withdraw` routing (ADR 0031). Each reads the Accounts as
 * the one before left them, never overdraws, and is outside cashflow: nothing here changes the net.
 */
export function applyTransfers(
	states: StateMap,
	scenario: Scenario,
	entries: readonly TransferEntry[],
	date: DateString,
	levies: LevySet | undefined,
): Moved {
	if (entries.length === 0) return NO_TRANSFERS
	const tally: Tally = { total: 0n, by: new Map(), unmoved: new Map(), into: new Map() }
	for (const entry of inScenarioOrder(entries, scenario)) {
		const problem = land(states, entry, date, levies, tally)
		if (problem !== undefined) return { ...tally, problem }
	}
	return { ...tally, problem: undefined }
}

/** The day's totals with what the transfers moved. */
export function withTransfers(totals: DayTotals, moved: Moved): DayTotals {
	return moved === NO_TRANSFERS
		? totals
		: { ...totals, transfers: moved.total, transferredTo: moved.into }
}
