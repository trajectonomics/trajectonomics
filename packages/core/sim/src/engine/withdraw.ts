import type { Inflation } from "../money/inflation"
import type { DateString, Scenario, WithdrawEntry } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { LevySet } from "./levy-set"
import { minBigInt } from "./min"
import { mutate } from "./mutate"
import { entryAccount, routedAt } from "./routed"
import { inflationOf } from "./run-scenario"
import type { AccountState, StateMap } from "./state"
import { addTracked, NO_ROUTING } from "./tracked"
import { valuation } from "./value"

export interface WithdrawResult {
	readonly remaining: bigint
	/**
	 * What each entry of `cashflow.withdraw` gave up on the date, by its position in the list as a string
	 * (an Account may appear twice, ADR 0030); only the nonzero takes, none unless tracked.
	 */
	readonly taken: ReadonlyMap<string, bigint>
	readonly problem: ProjectionProblem | undefined
}

/** Whether an asset is still locked on `date`: no draw and no sale moves anything from it. */
export function isLocked(state: AccountState, date: DateString): boolean {
	return (
		state.rule.kind === "asset" &&
		state.rule.lockedUntil !== undefined &&
		date < state.rule.lockedUntil
	)
}

interface TakeResult {
	readonly remaining: bigint
	readonly take: bigint
	readonly problem: ProjectionProblem | undefined
}

/** What an entry may take: the Account's value above its Reserve floor, or all of it when it has none. */
function drawable(
	state: AccountState,
	entry: WithdrawEntry,
	date: DateString,
	inflation: Inflation,
): bigint {
	const value = valuation(state, date)
	if (typeof entry === "string") return value
	return value - routedAt(entry.downTo, state, date, inflation)
}

function takeFrom(
	state: AccountState,
	available: bigint,
	date: DateString,
	remaining: bigint,
	levies: LevySet | undefined,
): TakeResult {
	const take = available > 0n ? minBigInt(remaining, available) : 0n
	if (take === 0n) return { remaining, take: 0n, problem: undefined }
	const problem = mutate(state, date, -take, levies)
	return problem === undefined
		? { remaining: remaining - take, take, problem: undefined }
		: { remaining, take: 0n, problem }
}

/** Takes a Shortfall from the withdrawal list in order; `track` keeps each take for the breakdown. */
export function applyWithdraw(
	states: StateMap,
	scenario: Scenario,
	date: DateString,
	amount: bigint,
	levies: LevySet | undefined,
	track: boolean,
): WithdrawResult {
	const taken = track ? new Map<string, bigint>() : undefined
	const outcome = takeSteps(states, scenario, date, amount, levies, taken)
	return { remaining: outcome.remaining, taken: taken ?? NO_ROUTING, problem: outcome.problem }
}

function takeSteps(
	states: StateMap,
	scenario: Scenario,
	date: DateString,
	amount: bigint,
	levies: LevySet | undefined,
	taken: Map<string, bigint> | undefined,
): { readonly remaining: bigint; readonly problem: ProjectionProblem | undefined } {
	let remaining = amount
	const { withdraw } = scenario.cashflow
	for (let position = 0; position < withdraw.length; position++) {
		if (remaining === 0n) break
		const entry = withdraw[position]!
		const state = states.get(entryAccount(entry))!
		if (isLocked(state, date)) continue
		const available = drawable(state, entry, date, inflationOf(scenario))
		const result = takeFrom(state, available, date, remaining, levies)
		remaining = result.remaining
		addTracked(taken, String(position), result.take)
		if (result.problem !== undefined) return { remaining, problem: result.problem }
	}
	return { remaining, problem: undefined }
}
