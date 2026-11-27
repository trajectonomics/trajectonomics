import type { ErrorBody } from "../../contract"
import { fieldOfRefusal } from "./refusal"

/** The problems a form found at its fields, keyed by field; `general` is for the form as a whole. */
export type Problems = Readonly<Record<string, string>>

/** What a form shows: a message at a field, and one for the whole form. */
export interface Shown {
	/** The message at a field: its own problem, or the CLI's message when its refusal names that field. */
	at: (field: string) => string | undefined
	/** The message for the whole form: its own general problem, or a refusal that names no field. */
	general: string | undefined
}

/**
 * What a form shows. A refusal at the whole path of the item the form edits (`item`), and at one of `fields`, is shown at
 * that field; a refusal at another item or at a path no field owns, or a message that is not a refusal at all (the server
 * was not reached), is shown for the whole form. `employer` is the whole path of the employer Flow a salary form writes.
 */
export function shownProblems(
	problems: Problems,
	refusal: ErrorBody | null,
	message: string | null,
	fields: readonly string[],
	item: readonly string[],
	employer?: readonly string[],
): Shown {
	const refused = fieldOfRefusal(refusal, fields, item, employer)
	const text = message ?? undefined
	return {
		at: (field) => problems[field] ?? (refused === field ? text : undefined),
		general: problems["general"] ?? (refused === null ? text : undefined),
	}
}
