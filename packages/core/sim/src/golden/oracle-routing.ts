import type { DateString, RoutedAmount, Scenario, SurplusStep, WithdrawEntry } from "../types"
import { oracleLeftOut } from "./oracle-access"
import { oracleGrowthYears } from "./oracle-date"
import { oracleGrow } from "./oracle-money"
import { type OracleState, type OracleStates, oracleMutate, oracleValuation } from "./oracle-state"

function least(left: bigint, right: bigint): bigint {
	return left < right ? left : right
}

/** A routing target on `date`: a number as it is, `{ amount, growth }` grown by the whole years since `start`. */
export function oracleTarget(
	target: RoutedAmount,
	start: DateString,
	date: DateString,
	inflation: number,
): bigint {
	if (typeof target === "number") return BigInt(target)
	const rate = target.growth === "inflation" ? inflation : target.growth.bps
	return oracleGrow(BigInt(target.amount), rate, oracleGrowthYears(start, date) * 365)
}

/** What one surplus step takes of `left`: `floor(left × share / 10000)`, up to what its `upTo` leaves room for. */
function stepFill(
	step: SurplusStep,
	state: OracleState,
	left: bigint,
	when: { readonly start: DateString; readonly date: DateString; readonly inflation: number },
): bigint {
	const want = step.share === undefined ? left : (left * BigInt(step.share)) / 10_000n
	if (step.upTo === undefined) return want
	const cap = oracleTarget(step.upTo, when.start, when.date, when.inflation)
	const room = cap - oracleValuation(state, when.date)
	return room > 0n ? least(want, room) : 0n
}

/** What the surplus steps filled, by Account, in order. */
export function oracleFill(
	states: OracleStates,
	scenario: Scenario,
	start: DateString,
	date: DateString,
	amount: bigint,
): Map<string, bigint> {
	const when = { start, date, inflation: scenario.economy.inflation }
	const filled = new Map<string, bigint>()
	let left = amount
	for (const step of scenario.cashflow.surplus) {
		const state = states.get(step.account)!
		const fill = left === 0n ? 0n : stepFill(step, state, left, when)
		if (fill === 0n) continue
		oracleMutate(state, date, fill)
		filled.set(step.account, (filled.get(step.account) ?? 0n) + fill)
		left -= fill
	}
	return filled
}

function floorOf(entry: WithdrawEntry, scenario: Scenario, start: DateString, date: DateString) {
	if (typeof entry === "string") return 0n
	return oracleTarget(entry.downTo, start, date, scenario.economy.inflation)
}

/** What each `withdraw` entry took, by position, and what stays unmet: an entry takes only what is above its floor. */
export function oracleDraw(
	states: OracleStates,
	scenario: Scenario,
	start: DateString,
	date: DateString,
	amount: bigint,
): { readonly unmet: bigint; readonly taken: Map<number, bigint> } {
	const taken = new Map<number, bigint>()
	let unmet = amount
	scenario.cashflow.withdraw.forEach((entry, position) => {
		const account = typeof entry === "string" ? entry : entry.account
		const state = states.get(account)!
		if (unmet === 0n || oracleLeftOut(state.rule, date)) return
		const above = oracleValuation(state, date) - floorOf(entry, scenario, start, date)
		const take = above > 0n ? least(unmet, above) : 0n
		if (take === 0n) return
		oracleMutate(state, date, -take)
		taken.set(position, take)
		unmet -= take
	})
	return { unmet, taken }
}
