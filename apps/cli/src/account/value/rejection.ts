import { type AppError, fail } from "../../errors"
import type { Refusal, ValueRequest } from "./types"

/**
 * The all-or-nothing rejection (ADR-0025's rule for a batch): every refused entry in the order it
 * was listed, the entry with the highest Exit class (ties by earliest) supplying the envelope's
 * code. The single form has one entry, so its own refusal is returned as it is.
 */
export function rejection(request: ValueRequest, refused: readonly Refusal[]): AppError {
	const ordered = [...refused].sort((a, b) => a.index - b.index)
	const first = ordered[0]!
	if (!request.batch) return first.error
	const winner = ordered.reduce((best, row) =>
		row.error.body.exitCode > best.error.body.exitCode ? row : best,
	)
	const { code, path } = winner.error.body
	const values = ordered.map(({ index, error }) => {
		const entry = request.entries.find((e) => e.index === index)!
		return {
			index,
			account: entry.account,
			date: entry.date,
			status: "rejected",
			reason: error.body,
		}
	})
	return fail(code, {
		message: "The values were rejected and nothing was written.",
		...(path === undefined ? {} : { path }),
		hint: `Fix document.values.${first.index} first: ${first.error.body.message}`,
		details: { values },
	})
}
