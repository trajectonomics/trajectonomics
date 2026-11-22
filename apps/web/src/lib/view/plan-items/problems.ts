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
 * What a form shows. A refusal that names one of `fields` is shown at that field; any other refusal, or
 * a message that is not a refusal at all (the server was not reached), is shown for the whole form.
 */
export function shownProblems(
	problems: Problems,
	refusal: ErrorBody | null,
	message: string | null,
	fields: readonly string[],
): Shown {
	const refused = fieldOfRefusal(refusal, fields)
	const text = message ?? undefined
	return {
		at: (field) => problems[field] ?? (refused === field ? text : undefined),
		general: problems["general"] ?? (refused === null ? text : undefined),
	}
}
