import type { ErrorBody } from "../../contract"

/**
 * The form field a refusal names, or null when it names none. The CLI's path ends in the field
 * (`document.flows.salary.amount`), and a rate's path runs through `growth`, so `growth` names `rate`.
 */
export function fieldOfRefusal(error: ErrorBody | null, fields: readonly string[]): string | null {
	if (error?.path === undefined) return null
	const segments = error.path.split(".")
	const last = segments[segments.length - 1] ?? ""
	if (fields.includes(last)) return last
	if (segments.includes("growth") && fields.includes("rate")) return "rate"
	return null
}
