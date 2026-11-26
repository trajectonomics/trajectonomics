import type { AppError } from "../errors"
import { keyOf, type StatedTally } from "./carryin-classes"
import type { CarryInEntry } from "./carryin-entry"
import type { ResolvedLevy } from "./carryin-resolve"
import {
	type FillWhere,
	refusedDifferent,
	refusedNoRecord,
	refusedUnstated,
} from "./carryin-shared-refuse"

/** The source record's entry for a period, when the other Return has one. */
export function sourceEntryOf(
	source: ResolvedLevy | undefined,
	periodStart: string,
): CarryInEntry | undefined {
	return source?.items.find((it) => it.entry.periodStart === periodStart)?.entry
}

/**
 * The other record's amount for a class: its tally, zero when it left the class to an empty scope
 * record or owes none, and undefined when it has no record for a period only it can state.
 */
export function sourceAmount(
	source: ResolvedLevy | undefined,
	periodStart: string,
	key: string,
): number | undefined {
	const item = source?.items.find((it) => it.entry.periodStart === periodStart)
	if (item !== undefined) {
		const found = item.entry.tallies.find((it) => keyOf(it) === key)
		if (found !== undefined) return found.amount
		return item.entry.source === "scope" ? 0 : undefined
	}
	const needed = source?.needed
	if (needed === null || needed === undefined) return undefined
	if (periodStart === needed.current && needed.starts.includes(needed.current)) return undefined
	return 0
}

/** One other-Filer class: the other record's amount, or the refusal that says why there is none. */
export function filledTally(input: {
	tally: StatedTally
	stated: boolean
	from: number | undefined
	where: FillWhere
}): StatedTally | AppError {
	if (input.from === undefined) {
		return input.stated ? input.tally : refusedNoRecord(input.where, input.tally)
	}
	if (input.stated && input.tally.amount !== input.from) {
		return refusedDifferent(input.where, input.tally, input.from)
	}
	return { ...input.tally, amount: input.from }
}

/** What a record asserts for a shared class: a stated tally, `rest`'s zero, or nothing at all. */
function asserted(
	entry: CarryInEntry | undefined,
	key: string,
	amount: number | undefined,
): number | undefined {
	if (entry === undefined) return undefined
	if (entry.stated.has(key)) return amount
	if (entry.rested.has(key) || entry.source === "scope") return 0
	return undefined
}

/**
 * One shared class: equal claims stay, the one record that asserts a value fills a record that
 * leaves the class out, and two different claims refuse. A `rest` zero is a claim, so a record that
 * rests a class the other states differently is refused rather than silently overridden. A class
 * neither record asserts is refused too: one record of the pair must state it, or cover it with
 * `rest`, so forgotten shared income never reads as none.
 */
export function filledShared(input: {
	entry: CarryInEntry
	source: CarryInEntry | undefined
	tally: StatedTally
	from: number | undefined
	where: FillWhere
}): StatedTally | AppError {
	const key = keyOf(input.tally)
	const mine = asserted(input.entry, key, input.tally.amount)
	const theirs = asserted(input.source, key, input.from)
	if (mine === undefined) {
		return theirs === undefined
			? refusedUnstated(input.where, input.tally)
			: { ...input.tally, amount: theirs }
	}
	if (theirs === undefined) return input.tally
	if (mine !== theirs) {
		return refusedDifferent(input.where, input.tally, theirs, {
			mineRested: input.entry.rested.has(key),
			theirsRested: input.source?.rested.has(key) ?? false,
			shared: true,
		})
	}
	return input.tally
}
