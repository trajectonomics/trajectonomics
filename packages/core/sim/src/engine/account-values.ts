import type { DateString } from "../types"
import type { StateMap } from "./state"
import { valuation } from "./value"

/** An Account's value on a Landed date, read before that date's Flows land (ADR 0020). */
export interface AccountValues {
	readonly at: (date: DateString, account: string) => bigint
}

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

/** The values another walk recorded, which a walk reads for the dates before `from`. */
export interface Beneath {
	readonly from: DateString
	readonly values: AccountValues
}

/** The values a walk recorded on each date, before that date's Flows landed. */
export interface RecordedValues extends AccountValues {
	/** Records the value of each watched Account in `states` on `date`; call it before the date's Flows. */
	readonly record: (date: DateString, states: StateMap) => void
}

/**
 * The values of `accounts` on each date a walk reports to `record`. A date before `beneath.from`
 * reads the walk beneath it, so a candidate's values continue its prefix's. A date the walk never
 * reached (after its Shortfall) reads `end`, the states the walk ended with, grown to that date.
 */
export function recordedValues(
	accounts: readonly string[],
	end: StateMap,
	beneath?: Beneath,
): RecordedValues {
	const rows = new Map<DateString, ReadonlyMap<string, bigint>>()
	return {
		record: (date, states) => {
			const row = new Map<string, bigint>()
			for (const id of accounts) {
				const state = states.get(id)
				row.set(id, state === undefined ? 0n : valuation(state, date))
			}
			rows.set(date, row)
		},
		at: (date, account) => {
			if (beneath !== undefined && date < beneath.from) return beneath.values.at(date, account)
			const found = rows.get(date)?.get(account)
			if (found !== undefined) return found
			const state = end.get(account)
			if (state === undefined) return 0n
			return date <= state.asOf ? state.balance : valuation(state, date)
		},
	}
}
