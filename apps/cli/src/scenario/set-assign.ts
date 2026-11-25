import { type AppError, isAppError } from "../errors"
import { badSet, flagError, type OverrideFlag, parsePath } from "./set-parse"

/** One parsed `--set`: the dotted segments and the JSON value they take. */
export type ParsedSet = { segments: string[]; value: unknown }

/** Splits at the first unescaped `=`; a backslash only shields the next character here. */
export function splitAssignment(
	raw: string,
	index: number,
	flag: OverrideFlag = "set",
): { path: string; value: string } | AppError {
	for (let at = 0; at < raw.length; at += 1) {
		const char = raw[at]
		if (char === "\\") {
			if (at + 1 >= raw.length) {
				return flagError(flag, index, `"${raw}" ends with a dangling \\`, {
					details: { path: raw },
				})
			}
			at += 1
			continue
		}
		if (char === "=") return { path: raw.slice(0, at), value: raw.slice(at + 1) }
	}
	return flagError(flag, index, `"${raw}" has no unescaped = between the path and the value`, {
		details: { path: raw },
	})
}

function parseValue(text: string, index: number): unknown | AppError {
	try {
		return JSON.parse(text)
	} catch {
		return badSet(index, `"${text}" is not JSON`, {
			hint: 'A --set value is a JSON literal: 50000 is a number, "50000" a string. Quote a string.',
			details: { path: text },
		})
	}
}

/** Parses one `path=json` string; nothing about the document is read here. */
export function parseSet(raw: string, index: number): ParsedSet | AppError {
	const parts = splitAssignment(raw, index)
	if (isAppError(parts)) return parts
	const segments = parsePath(parts.path, index)
	if (isAppError(segments)) return segments
	const value = parseValue(parts.value, index)
	return isAppError(value) ? value : { segments, value }
}
