import type { AccountId, DateString, Scenario } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { addTo } from "./add"
import type { ContributionEntry } from "./contribution-entries"
import { appliedByLabel, groupEntries, plannedTotal } from "./contribution-entries"
import type { LevySet } from "./levy-set"
import { mutate } from "./mutate"
import { compareIds } from "./order"
import type { StateMap } from "./state"

/** Whether the Scenario declares an employer Contribution, so its Projection reports employer money. */
export function declaresEmployer(scenario: Scenario): boolean {
	return scenario.flows.some((flow) => flow.kind === "contribution" && flow.funding === "employer")
}

export interface EmployerResult {
	/** Funded Tally labels of what landed; an unlabelled share is in no Tally. */
	readonly funded: ReadonlyMap<string, bigint>
	readonly problem: ProjectionProblem | undefined
}

/**
 * Employer Contributions land in full in their target Accounts, in account-id order, with the growth
 * accrued to the date. They are outside cashflow: nothing is subtracted from the day's net, capped by
 * Available cashflow or left unfunded, and the Cost basis grows as for any applied Contribution (ADR 0026).
 */
export function applyEmployer(
	states: StateMap,
	entries: readonly ContributionEntry[],
	date: DateString,
	levies: LevySet | undefined,
): EmployerResult {
	const groups = groupEntries(entries.filter((entry) => entry.employer))
	const funded = new Map<string, bigint>()
	for (const target of [...groups.keys()].sort(compareIds) as AccountId[]) {
		const group = groups.get(target) ?? []
		const amount = plannedTotal(group)
		const state = states.get(target)
		if (amount === 0n || state === undefined) continue
		const problem = mutate(state, date, amount, levies)
		if (problem !== undefined) return { funded, problem }
		for (const [label, share] of appliedByLabel(group, amount)) addTo(funded, label, share)
	}
	return { funded, problem: undefined }
}
