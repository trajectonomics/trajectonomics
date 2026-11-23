import type { AccountId, DateString, Scenario } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { LevySet } from "./levy-set"
import { minBigInt } from "./min"
import { mutate } from "./mutate"
import type { AccountState, StateMap } from "./state"
import { addTracked, NO_ROUTING } from "./tracked"
import { valuation } from "./value"

export interface WithdrawResult {
	readonly remaining: bigint
	/** What each Account gave up on the date, by Account id; only the nonzero takes, none unless tracked. */
	readonly taken: ReadonlyMap<AccountId, bigint>
	readonly problem: ProjectionProblem | undefined
}

function isLocked(state: AccountState, date: DateString): boolean {
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

function takeFrom(
	state: AccountState,
	date: DateString,
	remaining: bigint,
	levies: LevySet | undefined,
): TakeResult {
	const value = valuation(state, date)
	const take = minBigInt(remaining, value)
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
	const taken = track ? new Map<AccountId, bigint>() : undefined
	const outcome = takeSteps(states, scenario, date, amount, levies, taken)
	return { remaining: outcome.remaining, taken: taken ?? NO_ROUTING, problem: outcome.problem }
}

function takeSteps(
	states: StateMap,
	scenario: Scenario,
	date: DateString,
	amount: bigint,
	levies: LevySet | undefined,
	taken: Map<AccountId, bigint> | undefined,
): { readonly remaining: bigint; readonly problem: ProjectionProblem | undefined } {
	let remaining = amount
	for (const account of scenario.cashflow.withdraw) {
		if (remaining === 0n) break
		const state = states.get(account)!
		if (isLocked(state, date)) continue
		const result = takeFrom(state, date, remaining, levies)
		remaining = result.remaining
		addTracked(taken, account, result.take)
		if (result.problem !== undefined) return { remaining, problem: result.problem }
	}
	return { remaining, problem: undefined }
}
