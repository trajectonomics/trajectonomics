import type { ErrorBody } from "../../contract"
import { refusedRows, sentence } from "../record-values/refusal"
import type { ImportEntry } from "./types"

/** One refused value, named by where it sits in the pasted table. */
export interface RefusedValue {
	readonly row: number
	readonly column: string
	readonly account: string
	readonly date: string
	readonly message: string
}

/** What a refusal puts on the review: the values it names, a refused `against`, or one message for the batch. */
export interface ImportRefusal {
	readonly values: readonly RefusedValue[]
	readonly against?: string
	readonly general?: string
}

/**
 * Where a refusal goes: each entry of `details.values` is the row and column of the value that `index` names in the
 * batch that was sent (the CLI numbers entries in the order sent), a refused `against` is shown at that field, and
 * any other error is one sentence for the batch. Nothing was written in any of these.
 */
export function importRefusal(error: ErrorBody, sent: readonly ImportEntry[]): ImportRefusal {
	const listed = refusedRows.safeParse(error.details)
	if (listed.success && listed.data.values.length > 0) {
		const values = listed.data.values.flatMap(({ index, reason }) => {
			const entry = sent[index]
			if (entry === undefined) return []
			const { row, column, label, date } = entry
			return [{ row, column, account: label, date, message: sentence(reason.message, reason.hint) }]
		})
		if (values.length > 0) return { values }
	}
	if (error.code === "valuation_against_invalid") {
		return { values: [], against: sentence(error.message, error.hint) }
	}
	return { values: [], general: sentence(error.message, error.hint) }
}
