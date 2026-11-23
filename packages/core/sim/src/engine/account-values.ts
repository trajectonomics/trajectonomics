import type { DateString } from "../types"
import { isDerived } from "../types"
import type { DatedEvent } from "./events"
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

/**
 * The reader of a later Landed date over the states as they stand, which stays right for an Account
 * that nothing changes in between. It values a copy, so a nominal Account's states keep their date.
 */
export function readerAhead(states: StateMap, date: DateString): (account: string) => bigint {
	return (account) => {
		const state = states.get(account)
		return state === undefined ? 0n : valuation({ ...state }, date)
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
	/** Replaces the states a date past the walk reads: the states a continued walk ended with. */
	readonly endWith: (states: StateMap) => void
}

/** Whether a Landed date plans a Derived amount, the only thing that reads a recorded value. */
export function readsOn(landing: readonly DatedEvent[]): boolean {
	return landing.some((event) => isDerived(event.flow))
}

/** Records `date`'s values when its landing plans a Derived amount, which is when anything reads them. */
export function recordLanding(
	values: RecordedValues | undefined,
	date: DateString,
	states: StateMap,
	landing: readonly DatedEvent[],
): void {
	if (values !== undefined && readsOn(landing)) values.record(date, states)
}

/** The value of the latest row on or before `date`, or `undefined` before the first. */
function rowBefore(
	dates: readonly DateString[],
	rows: ReadonlyMap<DateString, ReadonlyMap<string, bigint>>,
	date: DateString,
	account: string,
): bigint | undefined {
	let low = 0
	let high = dates.length
	while (low < high) {
		const middle = (low + high) >> 1
		if (dates[middle]! <= date) low = middle + 1
		else high = middle
	}
	return low === 0 ? undefined : rows.get(dates[low - 1]!)?.get(account)
}

/**
 * The values of `accounts` on each date a walk reports to `record`, which is each date that plans a
 * Derived amount. A date before `beneath.from` reads the walk beneath it, so a candidate's values
 * continue its prefix's. A date the walk never reached (after its Shortfall) reads `end`, the states
 * the walk ended with, grown to that date; a date the walk skipped reads the row at or before it.
 */
export function recordedValues(
	accounts: readonly string[],
	end: StateMap,
	beneath?: Beneath,
): RecordedValues {
	const rows = new Map<DateString, ReadonlyMap<string, bigint>>()
	const dates: DateString[] = []
	let ended = end
	return {
		record: (date, states) => {
			const row = new Map<string, bigint>()
			for (const id of accounts) {
				const state = states.get(id)
				row.set(id, state === undefined ? 0n : valuation(state, date))
			}
			rows.set(date, row)
			dates.push(date)
		},
		endWith: (states) => {
			ended = states
		},
		at: (date, account) => {
			if (beneath !== undefined && date < beneath.from) return beneath.values.at(date, account)
			const found = rows.get(date)?.get(account)
			if (found !== undefined) return found
			const state = ended.get(account)
			if (state === undefined) return 0n
			if (date >= state.asOf) return valuation(state, date)
			return rowBefore(dates, rows, date, account) ?? 0n
		},
	}
}
