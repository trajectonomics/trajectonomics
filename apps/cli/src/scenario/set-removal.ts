import { type AppError, isAppError } from "../errors"
import { isPlainObject } from "../json"
import type { ScenarioDocument } from "./document"
import { formatPath } from "./path"
import { flagError, parsePath } from "./set-parse"
import { removeAt } from "./set-remove"

/*
 * The `--without` list (cli ADR-0056): parsed, refused when repeated, then applied in command-line
 * order to one document. Each removal is the pure copy `set-remove.ts` makes.
 */

/** Parses the `--without` paths, refusing an exact repeat, in command-line order (cli ADR-0056). */
export function parseWithouts(paths: readonly string[]): string[][] | AppError {
	const parsed: string[][] = []
	const seen = new Set<string>()
	for (const [index, raw] of paths.entries()) {
		const segments = parsePath(raw, index, "without")
		if (isAppError(segments)) return segments
		const path = formatPath(segments)
		if (seen.has(path)) {
			return flagError("without", index, `the path "${path}" is given twice`, {
				hint: "Each --without path may appear once.",
				details: { index, path },
			})
		}
		seen.add(path)
		parsed.push(segments)
	}
	return parsed
}

/**
 * Takes each `--without` list item out of the document, in command-line order, as one pure
 * function: the copy holds every other node. Returns the removed paths, escaped and canonical.
 */
export function applyRemovals(
	document: ScenarioDocument,
	paths: readonly string[],
): { document: ScenarioDocument; removals: string[] } | AppError {
	if (paths.length === 0) return { document, removals: [] }
	const parsed = parseWithouts(paths)
	if (isAppError(parsed)) return parsed
	let current: unknown = document
	const removals: string[] = []
	for (const [index, segments] of parsed.entries()) {
		const path = formatPath(segments)
		const next = removeAt(current, 0, [], { index, path, segments, flag: "without" })
		if (isAppError(next)) return next
		current = next
		removals.push(path)
	}
	if (!isPlainObject(current)) throw new Error("a removal replaced the document itself")
	return { document: current as ScenarioDocument, removals }
}
