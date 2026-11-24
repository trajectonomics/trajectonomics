import { isFee } from "../fee/flows"
import { scaleValue } from "../levy/scale"
import type { AccountId, DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { addTo } from "./add"
import type { DatedEvent } from "./events"
import type { LevySet } from "./levy-set"
import { minBigInt } from "./min"
import { mutate } from "./mutate"
import type { StateMap } from "./state"
import { valuation } from "./value"

/** The months in a year times 10,000: a fee in basis points a year, charged monthly. */
const MONTHLY_DEN = 120_000n

/**
 * What each fee Account owes on a date: `value × bps / 120000`, rounded as the fee says, where `value` is
 * the ADR 0020 valuation read before any of the date's Flows land (ADR 0028). Read first, charged last.
 */
export function feesOwed(
	states: StateMap,
	events: readonly DatedEvent[],
	date: DateString,
): ReadonlyMap<AccountId, bigint> {
	const owed = new Map<AccountId, bigint>()
	for (const { flow } of events) {
		if (!isFee(flow)) continue
		const state = states.get(flow.feeOf.account)
		if (state === undefined) continue
		const amount = scaleValue(
			valuation(state, date),
			BigInt(flow.feeOf.bps),
			MONTHLY_DEN,
			flow.feeOf.rounding,
		)
		addTo(owed, flow.feeOf.account, amount)
	}
	return owed
}

export interface Fees {
	/** What left the Accounts, summed. */
	readonly total: bigint
	/** What left each Account, only the nonzero. */
	readonly by: ReadonlyMap<AccountId, bigint>
	readonly problem: ProjectionProblem | undefined
}

/**
 * Takes each fee out of its Account after everything else on the date, never more than the Account then
 * holds. It is a distribution: no Cost basis is taken and no gain realised, and it is in no cashflow.
 */
export function applyFees(
	states: StateMap,
	owed: ReadonlyMap<AccountId, bigint>,
	date: DateString,
	levies: LevySet | undefined,
): Fees {
	const by = new Map<AccountId, bigint>()
	let total = 0n
	for (const [account, amount] of owed) {
		const state = states.get(account)
		if (state === undefined) continue
		const held = valuation(state, date)
		const taken = minBigInt(amount, held)
		if (taken === 0n) continue
		const problem = mutate(state, date, -taken, levies, true)
		if (problem !== undefined) return { total, by, problem }
		by.set(account, taken)
		total += taken
	}
	return { total, by, problem: undefined }
}
