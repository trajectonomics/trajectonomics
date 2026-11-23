import type { AccountId, DateString } from "../types"
import type { OracleEvent } from "./oracle-flow"
import type { PlannedDay } from "./oracle-planned"
import { type OracleState, type OracleStates, oracleMutate, oracleValuation } from "./oracle-state"

/** Planned amounts per Account for the Flows of one kind that name it, summed over the day. */
function sumBy(
	landing: readonly OracleEvent[],
	planned: PlannedDay,
	pick: (event: OracleEvent) => AccountId | undefined,
): ReadonlyMap<AccountId, bigint> {
	const seen = new Set<string>()
	const sums = new Map<AccountId, bigint>()
	for (const event of landing) {
		const account = pick(event)
		if (account === undefined || seen.has(event.flow.id)) continue
		seen.add(event.flow.id)
		sums.set(account, (sums.get(account) ?? 0n) + (planned.get(event.flow.id) ?? 0n))
	}
	return sums
}

/** The planned amount an obligation Contribution pays into each asset, summed per Account. */
export function oracleObligations(
	landing: readonly OracleEvent[],
	planned: PlannedDay,
): ReadonlyMap<AccountId, bigint> {
	return sumBy(landing, planned, ({ flow }) =>
		flow.kind === "contribution" && flow.funding === "obligation" ? flow.target : undefined,
	)
}

/** The planned amount each source is asked for by a withdrawal, summed per Account. */
export function oraclePlannedSources(
	landing: readonly OracleEvent[],
	planned: PlannedDay,
): ReadonlyMap<AccountId, bigint> {
	return sumBy(landing, planned, ({ flow }) =>
		flow.kind === "withdrawal" ? flow.source : undefined,
	)
}

/** Pays every obligation in full into its asset, and returns the total paid. */
export function oraclePayObligations(
	states: OracleStates,
	obligations: ReadonlyMap<AccountId, bigint>,
	date: DateString,
): bigint {
	let paid = 0n
	for (const [account, amount] of obligations) {
		oracleMutate(states.get(account)!, date, amount)
		paid += amount
	}
	return paid
}

function least(left: bigint, right: bigint): bigint {
	if (left < right) return left
	return right
}

/** What one source gives: a liability owes `amount` more; an asset gives up at most what it holds. */
function oracleMoveSource(state: OracleState, amount: bigint, date: DateString): bigint {
	if (state.rule.kind === "liability") {
		oracleMutate(state, date, amount)
		return amount
	}
	const locked = state.rule.lockedUntil !== undefined && date < state.rule.lockedUntil
	const take = locked ? 0n : least(amount, oracleValuation(state, date))
	if (take > 0n) oracleMutate(state, date, -take)
	return take
}

/** Moves cash in from every withdrawal source, in the order the day lists them; returns the cash. */
export function oracleMoveSources(
	states: OracleStates,
	planned: ReadonlyMap<AccountId, bigint>,
	date: DateString,
): bigint {
	let cash = 0n
	for (const [account, amount] of planned)
		cash += oracleMoveSource(states.get(account)!, amount, date)
	return cash
}
