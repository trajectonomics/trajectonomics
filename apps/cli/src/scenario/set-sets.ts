import { type AppError, isAppError } from "../errors"
import { formatPath } from "./path"
import { type ParsedSet, parseSet } from "./set-assign"
import { badSet } from "./set-parse"

/** Parses the `--set` list in command-line order; nothing about the document is read here. */
export function parseSets(sets: readonly string[]): ParsedSet[] | AppError {
	const parsed: ParsedSet[] = []
	for (const [index, raw] of sets.entries()) {
		const set = parseSet(raw, index)
		if (isAppError(set)) return set
		parsed.push(set)
	}
	return parsed
}

/** Refuses an exact repeat of a `--set` path, at the second one. */
export function duplicatePath(parsed: readonly ParsedSet[]): AppError | null {
	const seen = new Set<string>()
	for (const [index, set] of parsed.entries()) {
		const path = formatPath(set.segments)
		if (seen.has(path)) {
			return badSet(index, `the path "${path}" is given twice`, {
				hint: "Each --set path may appear once; later sets already see earlier ones.",
				details: { index, path },
			})
		}
		seen.add(path)
	}
	return null
}
