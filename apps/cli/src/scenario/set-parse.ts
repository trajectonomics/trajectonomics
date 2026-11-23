import { type AppError, fail, isAppError } from "../errors"

/** The input field an Override error points at: a `--set`, or a `--without` removal (cli ADR-0054). */
export type OverrideFlag = "set" | "without"

const SET_HINT = "A --set is path=json, such as --set flows.salary.amount=50000."
const WITHOUT_HINT = "A --without names one list item by its id, such as --without flows.gym."

/** An invalid Override points at its input field, never at a document path. */
export function flagError(
	flag: OverrideFlag,
	index: number,
	message: string,
	options: { hint?: string; details?: Record<string, unknown> } = {},
): AppError {
	return fail("invalid_input", {
		path: flag,
		message: `${flag}: ${message}`,
		hint: options.hint ?? (flag === "set" ? SET_HINT : WITHOUT_HINT),
		details: { index, ...options.details },
	})
}

/** An invalid `--set` always points at the input field `set`, never at a document path. */
export function badSet(
	index: number,
	message: string,
	options: { hint?: string; details?: Record<string, unknown> } = {},
): AppError {
	return flagError("set", index, message, options)
}

const SEGMENT = /(?:\\.|[^.])+/g

function unescapeSegment(part: string, index: number, flag: OverrideFlag): string | AppError {
	let text = ""
	for (let at = 0; at < part.length; at += 1) {
		const char = part[at] ?? ""
		if (char !== "\\") {
			text += char
			continue
		}
		const next = part[at + 1]
		if (next === undefined || !".\\=".includes(next)) {
			return flagError(flag, index, `"${part}" uses an escape other than \\. \\\\ or \\=`, {
				hint: "Only \\. \\\\ and \\= are escapes; any other backslash is invalid.",
				details: { path: part },
			})
		}
		text += next
		at += 1
	}
	return text
}

/**
 * Unescapes one dotted path: `\.`, `\\` and `\=` are literals, any other escape is invalid. The
 * `flag` says which input field a refusal names, so a `--without` path reports itself, not `set`.
 */
export function parsePath(
	text: string,
	index: number,
	flag: OverrideFlag = "set",
): string[] | AppError {
	if (text === "") {
		return flagError(flag, index, "the path before = is empty", { details: { path: text } })
	}
	const parts = text.match(SEGMENT) ?? []
	if (parts.join(".") !== text) {
		return flagError(flag, index, `"${text}" has an empty segment`, { details: { path: text } })
	}
	const segments: string[] = []
	for (const part of parts) {
		const segment = unescapeSegment(part, index, flag)
		if (isAppError(segment)) return segment
		segments.push(segment)
	}
	return segments
}
