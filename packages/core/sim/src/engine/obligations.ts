import type { AccountId, DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { addTo } from "./add"
import type { ContributionEntry } from "./contribution-entries"
import { appliedByLabel, groupEntries, plannedTotal } from "./contribution-entries"
import type { LevySet } from "./levy-set"
import { mutate } from "./mutate"
import { compareIds } from "./order"
import type { StateMap } from "./state"

export interface ObligationResult {
	readonly paid: bigint
	readonly funded: ReadonlyMap<string, bigint>
	readonly problem: ProjectionProblem | undefined
}

/**
 * Obligation Contributions into assets are paid in full, in account-id order, outside Available
 * cashflow: same-date amounts into one Account are summed, nothing is capped or left unfunded, and
 * the cash they use comes out of the day's net like a debt payment (ADR 0021).
 */
export function applyObligations(
	states: StateMap,
	entries: readonly ContributionEntry[],
	date: DateString,
	levies: LevySet | undefined,
): ObligationResult {
	const groups = groupEntries(entries.filter((entry) => entry.obligation))
	const funded = new Map<string, bigint>()
	let paid = 0n
	for (const target of [...groups.keys()].sort(compareIds) as AccountId[]) {
		const group = groups.get(target) ?? []
		const amount = plannedTotal(group)
		const state = states.get(target)
		if (amount === 0n || state === undefined) continue
		const problem = mutate(state, date, amount, levies)
		if (problem !== undefined) return { paid, funded, problem }
		paid += amount
		for (const [label, share] of appliedByLabel(group, amount)) addTo(funded, label, share)
	}
	return { paid, funded, problem: undefined }
}
