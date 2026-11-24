import { z } from "zod"
import type { ErrorBody } from "../../contract"
import type { SentRows, SheetProblems } from "./draft"

const refusedRows = z.object({
	values: z.array(
		z.object({
			index: z.number().int(),
			reason: z.object({ message: z.string(), hint: z.string().optional() }),
		}),
	),
})

/** The refusal's sentence without the path prefix `traj` writes first, such as `document.values.1.value: `. */
function sentence(message: string, hint?: string): string {
	const plain = message.replace(/^document\.[\w.]+: /, "")
	return hint === undefined ? plain : `${plain} ${hint}`
}

/**
 * Where a refused Edit's messages go: each rejected entry on its row (by `details.values[n].index`, the
 * place of the row in the batch that was sent), a refused `against` on that field, and anything else on the sheet.
 */
export function refusalProblems(error: ErrorBody | null, sent: SentRows): SheetProblems {
	if (error === null) return { rows: {} }
	const rows = refusedRows.safeParse(error.details)
	if (rows.success && rows.data.values.length > 0) {
		const placed: Record<string, string> = {}
		for (const { index, reason } of rows.data.values) {
			const id = sent[index]
			if (id !== undefined) placed[id] = sentence(reason.message, reason.hint)
		}
		return { rows: placed }
	}
	if (error.code === "valuation_against_invalid") {
		return { rows: {}, against: sentence(error.message, error.hint) }
	}
	return { rows: {}, general: sentence(error.message, error.hint) }
}
