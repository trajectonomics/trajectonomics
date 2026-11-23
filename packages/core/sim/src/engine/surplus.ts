import type { AccountId, DateString, Scenario, SurplusStep } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { addTo } from "./add"
import type { LevySet } from "./levy-set"
import { minBigInt } from "./min"
import { mutate } from "./mutate"
import type { StateMap } from "./state"
import { valuation } from "./value"

interface FillResult {
	readonly remaining: bigint
	readonly filled: bigint
	readonly problem: ProjectionProblem | undefined
}

/** What the surplus steps filled on one date, by Account, and the problem that stopped them. */
export interface SurplusResult {
	readonly filled: ReadonlyMap<AccountId, bigint>
	readonly problem: ProjectionProblem | undefined
}

function fillStep(
	states: StateMap,
	step: SurplusStep,
	date: DateString,
	remaining: bigint,
	levies: LevySet | undefined,
): FillResult {
	const state = states.get(step.account)!
	const headroom = step.upTo === undefined ? remaining : BigInt(step.upTo) - valuation(state, date)
	let fill = 0n
	if (headroom > 0n) fill = minBigInt(remaining, headroom)
	if (fill === 0n) return { remaining, filled: 0n, problem: undefined }
	const problem = mutate(state, date, fill, levies)
	return problem === undefined
		? { remaining: remaining - fill, filled: fill, problem: undefined }
		: { remaining, filled: 0n, problem }
}

export function applySurplus(
	states: StateMap,
	scenario: Scenario,
	date: DateString,
	amount: bigint,
	levies: LevySet | undefined,
): SurplusResult {
	const filled = new Map<AccountId, bigint>()
	let remaining = amount
	for (const step of scenario.cashflow.surplus) {
		if (remaining === 0n) break
		const result = fillStep(states, step, date, remaining, levies)
		remaining = result.remaining
		if (result.filled > 0n) addTo(filled, step.account, result.filled)
		if (result.problem !== undefined) return { filled, problem: result.problem }
	}
	return { filled, problem: undefined }
}
