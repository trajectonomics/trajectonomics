import type { Fixture } from "../fixtures/fixture"
import type { DateString } from "../types"
import type { Landed } from "./oracle-cashflow-day"
import { add, min, type OracleTotals } from "./oracle-cashflow-types"
import { type OracleState, oracleMutate, oracleValuation } from "./oracle-state"

function total(entries: readonly Landed[]): bigint {
	return entries.reduce((sum, item) => sum + item.amount, 0n)
}

function contributionsTo(landed: readonly Landed[], target: string): Landed[] {
	return landed.filter(
		(item) =>
			item.flow.kind === "contribution" &&
			item.flow.target === target &&
			item.flow.funding !== "employer",
	)
}

/** Splits `amount` over the contribution Flows in Scenario order, first come first served. */
export function split(
	totals: OracleTotals,
	entries: readonly Landed[],
	amount: bigint,
	asset: boolean,
): void {
	let remaining = amount
	for (const entry of entries) {
		const take = min(entry.amount, remaining)
		remaining -= take
		add(totals.applied, entry.flow.id, take)
		if (asset) add(totals.unfunded, entry.flow.id, entry.amount - take)
	}
}

/** Pays each liability what is owed, up to the planned amount, and returns the total paid. */
export function payDebt(
	fixture: Fixture,
	states: Map<string, OracleState>,
	totals: OracleTotals,
	date: DateString,
	landed: readonly Landed[],
): bigint {
	let debt = 0n
	for (const rule of fixture.scenario.accounts) {
		if (rule.kind !== "liability") continue
		const entries = contributionsTo(landed, rule.id)
		const state = states.get(rule.id)!
		const paid = min(total(entries), oracleValuation(state, date))
		if (paid > 0n) oracleMutate(state, date, -paid)
		split(totals, entries, paid, false)
		debt += paid
	}
	return debt
}

/** Grants each asset target in `contribute` order, up to what Available cashflow still covers. */
export function grantAssets(
	fixture: Fixture,
	states: Map<string, OracleState>,
	totals: OracleTotals,
	date: DateString,
	landed: readonly Landed[],
	available: bigint,
): bigint {
	let budget = available
	let applied = 0n
	for (const target of fixture.scenario.cashflow.contribute) {
		const entries = contributionsTo(landed, target)
		const planned = total(entries)
		if (planned === 0n) continue
		const granted = min(planned, budget)
		if (granted > 0n) oracleMutate(states.get(target)!, date, granted)
		split(totals, entries, granted, true)
		budget -= granted
		applied += granted
	}
	return applied
}
