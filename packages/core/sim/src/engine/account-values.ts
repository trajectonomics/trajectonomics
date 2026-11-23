import type { DateString } from "../types"
import type { StateMap } from "./state"
import { valuation } from "./value"

/** An Account's value on a Landed date, read before that date's Flows land (ADR 0020). */
export interface AccountValues {
	readonly at: (date: DateString, account: string) => bigint
}

/** Called by a run before each date's Flows land, with the states as they stand. */
export type Observed = (date: DateString, states: StateMap) => void

/** The Account reader of one date over the states as they stand: what a Derived amount's `account` reads. */
export function readerAt(states: StateMap, date: DateString): (account: string) => bigint {
	return (account) => {
		const state = states.get(account)
		return state === undefined ? 0n : valuation(state, date)
	}
}

/** The Account reader of one date over the values an {@link AccountValues} holds. */
export function readerOn(values: AccountValues, date: DateString): (account: string) => bigint {
	return (account) => values.at(date, account)
}

/**
 * The values an unchanged run holds, observed on first use only: `run` walks the Scenario once and
 * reports each date to `observe`. A date the run never reached (after its Shortfall, or past its
 * horizon) reads the last states it ended with, grown to that date.
 */
export function unchangedValues(run: (observe: Observed) => void): AccountValues {
	let rows: Map<DateString, ReadonlyMap<string, bigint>> | undefined
	let last: StateMap | undefined
	const load = (): Map<DateString, ReadonlyMap<string, bigint>> => {
		const observed = new Map<DateString, ReadonlyMap<string, bigint>>()
		rows = observed
		run((date, states) => {
			last = states
			const row = new Map<string, bigint>()
			for (const [id, state] of states) row.set(id, valuation(state, date))
			observed.set(date, row)
		})
		return observed
	}
	return {
		at: (date, account) => {
			const found = (rows ?? load()).get(date)?.get(account)
			if (found !== undefined) return found
			const state = last?.get(account)
			return state === undefined ? 0n : valuation(state, date)
		},
	}
}
