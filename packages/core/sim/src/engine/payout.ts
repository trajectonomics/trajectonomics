import { isPayout } from "../payout/flows"
import type { AccountId, DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { addTo } from "./add"
import type { Planned } from "./derive"
import type { DatedEvent } from "./events"
import type { LevySet } from "./levy-set"
import { mutate } from "./mutate"
import { occurrenceAmount } from "./occurrence-amount"
import type { StateMap } from "./state"

/**
 * Takes each payout out of its Account, in event order (Flow id), before the date's sales and payments:
 * the amount the income Flow landed, read from the Account before anything landed (ADR 0027). It is a
 * distribution, so it takes no Cost basis and realises no gain, and a locked Account pays out too. A
 * payout never exceeds the value it was read from, so no Account is overdrawn.
 */
export interface Payouts {
	/** What left the Accounts, summed: the payouts that landed as income on the date. */
	readonly paid: bigint
	/** The same, by the Account each left, only the nonzero. */
	readonly by: ReadonlyMap<AccountId, bigint>
	readonly problem: ProjectionProblem | undefined
}

export function applyPayouts(
	states: StateMap,
	events: readonly DatedEvent[],
	planned: Planned,
	date: DateString,
	levies: LevySet | undefined,
): Payouts {
	let paid = 0n
	const by = new Map<AccountId, bigint>()
	for (const event of events) {
		const { flow } = event
		if (!isPayout(flow)) continue
		const amount = occurrenceAmount(event, planned)
		const state = states.get(flow.payoutOf.account)
		if (amount === 0n || state === undefined) continue
		const problem = mutate(state, date, -amount, levies, "payout")
		if (problem !== undefined) return { paid, by, problem }
		paid += amount
		addTo(by, flow.payoutOf.account, amount)
	}
	return { paid, by, problem: undefined }
}
