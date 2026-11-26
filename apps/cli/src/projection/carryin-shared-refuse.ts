import { type AppError, fail } from "../errors"
import { formatMinorUnits } from "../store"
import type { StatedTally } from "./carryin-classes"

/** Where a fill problem came from: the record's path, its Levy and period, and the other Return. */
export type FillWhere = {
	readonly path: string
	readonly currency: string
	readonly levy: string
	readonly other: string
	readonly periodStart: string
}

/**
 * The refusal for a record that leaves the other Filer's income unstated, to `rest` or out, while the
 * other Return has no record of its own for the period to read it from.
 */
export function refusedNoRecord(where: FillWhere, tally: StatedTally, rested: boolean): AppError {
	const leaves = rested
		? `leaves "${tally.label}" to "rest": "0.00"`
		: `does not state "${tally.label}"`
	return fail("invalid_input", {
		path: where.path,
		message: `The record for "${where.levy}" from ${where.periodStart} ${leaves}, but the Return of "${where.other}" has no Carry-in record of its own for that period to read it from.`,
		hint: `State "${tally.label}" in this record, or a record for "${where.other}" for the same period with that Return's own income; the two Returns share one loan.`,
		details: {
			levy: where.levy,
			periodStart: where.periodStart,
			other: where.other,
			label: tally.label,
		},
	})
}

/** The hint when a record states the other Filer's own income differently. */
const OTHER_HINT = `State the other Filer's income in their own record, or leave it to "rest": "0.00".`

/** The hint for a shared class two records hold differently: what each record can change. */
function sharedHint(where: FillWhere, tally: StatedTally, from: number, how: DifferentHow): string {
	const theirs = formatMinorUnits(from, where.currency)
	if (how.mineRested) {
		return `State ${theirs} for "${tally.label}" in this record too, or drop "rest" from it and name each of its own classes, so the other record's amount is used.`
	}
	if (how.theirsRested) {
		return `State ${formatMinorUnits(tally.amount, where.currency)} for "${tally.label}" in the record for "${where.other}" too, or leave it out of this record so the other record's zero is used.`
	}
	return "State the same shared income in both Returns' records, or leave the class out of one of them."
}

/** The refusal for a shared class neither record of the pair states or covers with `rest`. */
export function refusedUnstated(
	where: FillWhere,
	tally: StatedTally,
	otherHasRecord: boolean,
): AppError {
	const hint = otherHasRecord
		? `State it in either Return's record, or add "rest": "0.00" to one of them if there was none.`
		: `State it in this record, or add "rest": "0.00" to it if there was none.`
	return fail("invalid_input", {
		path: where.path,
		message: `Neither the record for "${where.levy}" nor the record for "${where.other}" from ${where.periodStart} names "${tally.label}", the income both share.`,
		hint,
		details: {
			levy: where.levy,
			periodStart: where.periodStart,
			other: where.other,
			label: tally.label,
		},
	})
}

/** How each record held the class a shared-loan pair states differently. */
export type DifferentHow = {
	/** This record left the class to `rest`'s zero rather than naming it. */
	readonly mineRested?: boolean
	/** The other Return's record left the class to `rest`'s zero. */
	readonly theirsRested?: boolean
	/** The class is the income of both, so the hint names the shared income. */
	readonly shared?: boolean
}

/** The refusal for a record that states another Return's income differently from that Return. */
export function refusedDifferent(
	where: FillWhere,
	tally: StatedTally,
	from: number,
	how: DifferentHow = {},
): AppError {
	const mine = how.mineRested
		? `leaves "${tally.label}" to "rest": "0.00"`
		: `states "${tally.label}" as ${formatMinorUnits(tally.amount, where.currency)}`
	const theirs = how.theirsRested
		? `leaves it to "rest": "0.00"`
		: `states it as ${formatMinorUnits(from, where.currency)}`
	const hint = how.shared ? sharedHint(where, tally, from, how) : OTHER_HINT
	return fail("invalid_input", {
		path: where.path,
		message: `The record for "${where.levy}" from ${where.periodStart} ${mine}, but the Return of "${where.other}" ${theirs}.`,
		hint,
		details: {
			levy: where.levy,
			periodStart: where.periodStart,
			other: where.other,
			label: tally.label,
			amount: formatMinorUnits(from, where.currency),
		},
	})
}
