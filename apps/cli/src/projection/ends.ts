import type { AnnualRollup, ProjectionRow } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { fail } from "../errors"
import { rowAtEnd } from "./rows"

/**
 * The monthly row at each roll-up's end, the row `realNetWorth` is read on. A one-day last roll-up
 * ends on the row the one before it ended on, so that row is listed once. The tables that state a
 * figure per Account or per estate read these rows (cli ADR-0060, ADR-0064).
 */
export function endRowsOf(
	rollups: readonly AnnualRollup[],
	rows: readonly ProjectionRow[],
): ProjectionRow[] | AppError {
	const ends: ProjectionRow[] = []
	for (const rollup of rollups) {
		const end = rowAtEnd(rollup, rows)
		if (end === undefined) {
			return fail("internal", {
				message: `The roll-up ending ${rollup.to} has no monthly row on that day or the next.`,
			})
		}
		if (ends.at(-1)?.date !== end.date) ends.push(end)
	}
	return ends
}
