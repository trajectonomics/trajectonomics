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

/** The refusal for a record that leaves the other Filer's income to `rest` with no record to read. */
export function refusedNoRecord(where: FillWhere, tally: StatedTally): AppError {
	return fail("invalid_input", {
		path: where.path,
		message: `The record for "${where.levy}" from ${where.periodStart} leaves "${tally.label}" to "rest": "0.00", but the Return of "${where.other}" has no Carry-in record for that period.`,
		hint: `State a record for "${where.other}" for the same period, with that Return's own income; the two Returns share one loan.`,
		details: {
			levy: where.levy,
			periodStart: where.periodStart,
			other: where.other,
			label: tally.label,
		},
	})
}

/** The refusal for a record that states another Return's income differently from that Return. */
export function refusedDifferent(where: FillWhere, tally: StatedTally, from: number): AppError {
	return fail("invalid_input", {
		path: where.path,
		message: `The record for "${where.levy}" from ${where.periodStart} states "${tally.label}" as ${formatMinorUnits(tally.amount, where.currency)}, but the Return of "${where.other}" states it as ${formatMinorUnits(from, where.currency)}.`,
		hint: `State the other Filer's income in their own record, or leave it to "rest": "0.00".`,
		details: {
			levy: where.levy,
			periodStart: where.periodStart,
			other: where.other,
			label: tally.label,
			amount: formatMinorUnits(from, where.currency),
		},
	})
}
