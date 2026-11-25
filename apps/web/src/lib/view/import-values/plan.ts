import type { EditInput } from "../../edit/edit"
import { RECORD_VALUES_MAX_ROWS } from "../../edit/record-values"
import { type Matches, SKIP } from "./match"
import type { ImportEntry, ParsedImport } from "./types"

/** The values to send, in date order, and what the review states about them. */
export interface ImportPlan {
	/** The entries sent, in the order sent: a refusal's `index` names one of them. */
	readonly sent: readonly ImportEntry[]
	readonly account: Readonly<Record<string, string>>
	readonly earliest: string | null
	readonly latest: string | null
	/** True when there are more values than one Edit may carry. */
	readonly tooMany: boolean
}

/** The values of the matched columns, in date order (the CLI's batch order), with their dates' range. */
export function importPlan(parsed: ParsedImport, matches: Matches): ImportPlan {
	const account: Record<string, string> = {}
	for (const [key, id] of Object.entries(matches)) if (id !== SKIP) account[key] = id
	const sent = parsed.entries.filter((entry) => account[entry.source] !== undefined)
	return {
		sent,
		account,
		earliest: sent[0]?.date ?? null,
		latest: sent.at(-1)?.date ?? null,
		tooMany: sent.length > RECORD_VALUES_MAX_ROWS,
	}
}

/** The `record-values` Edit of a plan, with the values as typed; `preview` runs it as the dry run alone. */
export function importEdit(plan: ImportPlan, against: string, preview: boolean): EditInput {
	const values = plan.sent.map((entry) => ({
		account: plan.account[entry.source] ?? "",
		date: entry.date,
		value: entry.value,
	}))
	return { kind: "record-values", against, values, ...(preview ? { preview: true as const } : {}) }
}
