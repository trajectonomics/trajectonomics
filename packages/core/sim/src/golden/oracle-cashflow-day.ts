import type { Fixture } from "../fixtures/fixture"
import type { DateString, Flow } from "../types"
import { grantAssets, payDebt } from "./oracle-cashflow-pay"
import { drawFrom, fillSurplus } from "./oracle-cashflow-route"
import { add, type OracleTotals } from "./oracle-cashflow-types"
import { type OracleState, oracleMutate } from "./oracle-state"

export interface Landed {
	readonly flow: Flow
	readonly amount: bigint
}

interface Landing {
	income: bigint
	expense: bigint
	prepaid: bigint
	withdrawn: bigint
}

/** Lands one Flow's amount: a planned withdrawal borrows at once; income pays its Prepayment shares. */
function landOne(
	day: Landing,
	states: Map<string, OracleState>,
	totals: OracleTotals,
	date: DateString,
	{ flow, amount }: Landed,
): void {
	if (flow.kind === "expense") day.expense += amount
	if (flow.kind === "expense" || flow.kind === "income" || flow.kind === "withdrawal") {
		add(totals.planned, flow.id, amount)
	}
	if (flow.kind === "withdrawal") {
		day.withdrawn += amount
		oracleMutate(states.get(flow.source)!, date, amount)
	}
	if (flow.kind !== "income") return
	day.income += amount
	for (const share of flow.prepayments ?? []) {
		const taken = (amount * BigInt(share.bps)) / 10_000n
		add(totals.prepaid, share.levy, taken)
		day.prepaid += taken
	}
}

/** Walks one landed day in the engine's order: borrowing, debt, asset grants, then routing. */
export function walkDay(
	fixture: Fixture,
	states: Map<string, OracleState>,
	totals: OracleTotals,
	date: DateString,
	landed: readonly Landed[],
): void {
	const day: Landing = { income: 0n, expense: 0n, prepaid: 0n, withdrawn: 0n }
	for (const item of landed) landOne(day, states, totals, date, item)
	const debt = payDebt(fixture, states, totals, date, landed)
	const cashflow = day.income - day.prepaid - day.expense - debt
	const assets = grantAssets(fixture, states, totals, date, landed, cashflow > 0n ? cashflow : 0n)
	const net = cashflow + day.withdrawn - assets
	if (net > 0n) fillSurplus(fixture, states, totals, date, net)
	if (net < 0n) totals.unmet = drawFrom(fixture, states, totals, date, -net)
}
