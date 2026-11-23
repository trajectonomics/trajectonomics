import type { DateString } from "../types"
import { isDerived, isRuled } from "../types"
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
	/** The dates a window reads that the walk records whatever its own landing plans (ADR 0020). */
	readonly reads: ReadonlySet<DateString>
	/** Records the value of each watched Account in `states` on `date`; call it before the date's Flows. */
	readonly record: (date: DateString, states: StateMap) => void
	/** Replaces the states a date past the walk reads: the states a continued walk ended with. */
	readonly endWith: (states: StateMap) => void
}

/** Whether a Landed date plans a Derived amount or a Spending rule, which read a recorded value. */
export function readsOn(landing: readonly DatedEvent[]): boolean {
	return landing.some((event) => isDerived(event.flow) || isRuled(event.flow))
}

/**
 * Records `date`'s values when its landing plans a Derived amount, a window reads the date, or a
 * Milestone fired on it. A window prices the original plan's events, which a candidate that stopped
 * them does not land: the deferred `once` Flow a fired Milestone lands on its fire date is one.
 */
export function recordLanding(
	values: RecordedValues | undefined,
	date: DateString,
	states: StateMap,
	landing: readonly DatedEvent[],
	fired = false,
): void {
	if (values !== undefined && (fired || values.reads.has(date) || readsOn(landing))) {
		values.record(date, states)
	}
}

/** The value of the latest row on or before `date`; a walk records every date a window reads. */
function rowBefore(
	dates: readonly DateString[],
	rows: ReadonlyMap<DateString, ReadonlyMap<string, bigint>>,
	date: DateString,
	account: string,
): bigint {
	let low = 0
	let high = dates.length
	while (low < high) {
		const middle = (low + high) >> 1
		if (dates[middle]! <= date) low = middle + 1
		else high = middle
	}
	const row = low === 0 ? undefined : rows.get(dates[low - 1]!)?.get(account)
	if (row === undefined) throw new Error(`No value of ${account} recorded on or before ${date}`)
	return row
}

/**
 * The values of `accounts` on each date a walk reports to `record`: each date that plans a Derived
 * amount, and each date in `reads`. A row is the value on the row's own date, not grown to the date
 * asked for, so a date a window reads must have a row. A date before `beneath.from` reads the walk
 * beneath it, so a candidate's values continue its prefix's. A date the walk never reached (after its
 * Shortfall) reads `end`, the states the walk ended with, grown to that date. A date before the
 * walk's last state reads its own row, and one with none is an internal error: the walk records every
 * date a window reads, so none is missing.
 */
export function recordedValues(
	accounts: readonly string[],
	end: StateMap,
	beneath?: Beneath,
	reads: ReadonlySet<DateString> = new Set(),
): RecordedValues {
	const rows = new Map<DateString, ReadonlyMap<string, bigint>>()
	const dates: DateString[] = []
	let ended = end
	return {
		reads,
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
			return rowBefore(dates, rows, date, account)
		},
	}
}
