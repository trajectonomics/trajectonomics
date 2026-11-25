import type { AccountId, DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { addTo } from "./add"
import { grantAsset } from "./asset-grant"
import type { ContributionEntry } from "./contribution-entries"
import { appliedByLabel, groupEntries, plannedTotal } from "./contribution-entries"
import type { LevySet } from "./levy-set"
import { minBigInt } from "./min"
import { mutate } from "./mutate"
import { compareIds } from "./order"
import type { StateMap } from "./state"
import { valuation } from "./value"

export interface DebtResult {
	readonly paid: bigint
	/** The debt payment each liability received on the date; only the nonzero payments. */
	readonly paidBy: ReadonlyMap<AccountId, bigint>
	readonly funded: ReadonlyMap<string, bigint>
	readonly problem: ProjectionProblem | undefined
}

export interface AssetResult {
	readonly applied: bigint
	readonly funded: ReadonlyMap<string, bigint>
	readonly unfunded: ReadonlyMap<AccountId, bigint>
	readonly problem: ProjectionProblem | undefined
}

interface TargetPayment {
	readonly paid: bigint
	readonly funded: ReadonlyMap<string, bigint>
	readonly problem: ProjectionProblem | undefined
}

const NOTHING: TargetPayment = { paid: 0n, funded: new Map(), problem: undefined }

function applyDebtTarget(
	states: StateMap,
	target: AccountId,
	entries: readonly ContributionEntry[],
	date: DateString,
	levies: LevySet | undefined,
): TargetPayment {
	const state = states.get(target)
	const planned = plannedTotal(entries)
	if (state?.rule.kind !== "liability" || planned === 0n) return NOTHING
	const payment = minBigInt(planned, valuation(state, date))
	if (payment === 0n) return NOTHING
	const problem = mutate(state, date, -payment, levies)
	if (problem !== undefined) return { paid: 0n, funded: new Map(), problem }
	return { paid: payment, funded: appliedByLabel(entries, payment), problem: undefined }
}

/** Liability payments are obligations: each pays `min(planned, owed)`, in account-id order. */
export function applyDebt(
	states: StateMap,
	entries: readonly ContributionEntry[],
	date: DateString,
	levies: LevySet | undefined,
): DebtResult {
	const groups = groupEntries(entries)
	let paid = 0n
	const paidBy = new Map<AccountId, bigint>()
	const funded = new Map<string, bigint>()
	for (const target of [...groups.keys()].sort(compareIds)) {
		const result = applyDebtTarget(states, target, groups.get(target) ?? [], date, levies)
		if (result.problem !== undefined) return { paid, paidBy, funded, problem: result.problem }
		paid += result.paid
		if (result.paid > 0n) paidBy.set(target, result.paid)
		for (const [label, amount] of result.funded) addTo(funded, label, amount)
	}
	return { paid, paidBy, funded, problem: undefined }
}

/**
 * Asset targets spend only `available` cashflow, in `contribute` priority order. The part that
 * does not fit is reported as unfunded and dropped; a zero grant never touches an account.
 * An obligation is not here: it is paid in full before `available` is computed. Nor is an employer
 * share, which lands outside cashflow (ADR 0026).
 */
export function applyAssets(
	states: StateMap,
	contribute: readonly AccountId[],
	entries: readonly ContributionEntry[],
	available: bigint,
	date: DateString,
	levies: LevySet | undefined,
): AssetResult {
	const groups = groupEntries(entries.filter((entry) => !entry.obligation && !entry.employer))
	let remaining = available
	let applied = 0n
	const funded = new Map<string, bigint>()
	const unfunded = new Map<AccountId, bigint>()
	for (const target of contribute) {
		const targetEntries = groups.get(target) ?? []
		if (plannedTotal(targetEntries) === 0n) continue
		const grant = grantAsset(states, target, targetEntries, remaining, date, levies)
		if (grant.problem !== undefined) {
			return { applied, funded, unfunded, problem: grant.problem }
		}
		if (grant.unfunded > 0n) unfunded.set(target, grant.unfunded)
		remaining -= grant.applied
		applied += grant.applied
		for (const [label, amount] of grant.funded) addTo(funded, label, amount)
	}
	return { applied, funded, unfunded, problem: undefined }
}
