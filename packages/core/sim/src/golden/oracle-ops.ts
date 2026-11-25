import type { DateString, Scenario } from "../types"
import { type OracleEvent, oracleAmount } from "./oracle-flow"
import { oracleDraw, oracleFill } from "./oracle-routing"
import type { OracleStates } from "./oracle-state"

export function oracleIncomeExpense(
	events: readonly OracleEvent[],
	inflation: number,
): readonly [income: bigint, expense: bigint] {
	let income = 0n
	let expense = 0n
	for (const event of events) {
		const amount = oracleAmount(event, inflation)
		if (event.flow.kind === "income") income += amount
		if (event.flow.kind === "expense") expense += amount
	}
	return [income, expense]
}

export function oracleSurplus(
	states: OracleStates,
	scenario: Scenario,
	start: DateString,
	date: DateString,
	amount: bigint,
): void {
	oracleFill(states, scenario, start, date, amount)
}

export function oracleWithdraw(
	states: OracleStates,
	scenario: Scenario,
	start: DateString,
	date: DateString,
	amount: bigint,
): bigint {
	return oracleDraw(states, scenario, start, date, amount).unmet
}
