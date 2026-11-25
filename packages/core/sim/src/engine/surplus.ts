import type { AccountId, DateString, Scenario, SurplusStep } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { LevySet } from "./levy-set"
import { minBigInt } from "./min"
import { mutate } from "./mutate"
import { routedAt } from "./routed"
import type { StateMap } from "./state"
import { addTracked, NO_ROUTING } from "./tracked"
import { valuation } from "./value"

interface FillResult {
	readonly remaining: bigint
	readonly filled: bigint
	readonly problem: ProjectionProblem | undefined
}

/** What the surplus steps filled on one date, by Account, and the problem that stopped them. */
export interface SurplusResult {
	/** Empty unless the run tracks the breakdown, so a plain run allocates no map for it. */
	readonly filled: ReadonlyMap<AccountId, bigint>
	readonly problem: ProjectionProblem | undefined
}

const WHOLE = 10_000n

/** What a step would take of `remaining`: all of it, or `floor(remaining × share / 10000)` (ADR 0030). */
function wanted(step: SurplusStep, remaining: bigint): bigint {
	return step.share === undefined ? remaining : (remaining * BigInt(step.share)) / WHOLE
}

function fillStep(
	states: StateMap,
	scenario: Scenario,
	step: SurplusStep,
	date: DateString,
	remaining: bigint,
	levies: LevySet | undefined,
): FillResult {
	const state = states.get(step.account)!
	const want = wanted(step, remaining)
	const room =
		step.upTo === undefined
			? want
			: routedAt(step.upTo, state, date, scenario.economy.inflation) - valuation(state, date)
	let fill = 0n
	if (room > 0n) fill = minBigInt(want, room)
	if (fill === 0n) return { remaining, filled: 0n, problem: undefined }
	const problem = mutate(state, date, fill, levies)
	return problem === undefined
		? { remaining: remaining - fill, filled: fill, problem: undefined }
		: { remaining, filled: 0n, problem }
}

/** Fills the surplus steps in order; `track` keeps each fill for the cash-flow breakdown. */
export function applySurplus(
	states: StateMap,
	scenario: Scenario,
	date: DateString,
	amount: bigint,
	levies: LevySet | undefined,
	track: boolean,
): SurplusResult {
	const filled = track ? new Map<AccountId, bigint>() : undefined
	const problem = fillSteps(states, scenario, date, amount, levies, filled)
	return { filled: filled ?? NO_ROUTING, problem }
}

function fillSteps(
	states: StateMap,
	scenario: Scenario,
	date: DateString,
	amount: bigint,
	levies: LevySet | undefined,
	filled: Map<AccountId, bigint> | undefined,
): ProjectionProblem | undefined {
	let remaining = amount
	for (const step of scenario.cashflow.surplus) {
		if (remaining === 0n) break
		const result = fillStep(states, scenario, step, date, remaining, levies)
		remaining = result.remaining
		addTracked(filled, step.account, result.filled)
		if (result.problem !== undefined) return result.problem
	}
	return undefined
}
