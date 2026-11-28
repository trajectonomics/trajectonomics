import { isAppError } from "../../errors"
import { isPlainObject } from "../../json"
import { parsePath } from "../set-parse"

/** A path's value in a document, or that the path holds nothing (cli ADR-0084). */
export type Found = { found: true; value: unknown } | { found: false }

/**
 * The value `path` names in `document`, in the Override grammar: object keys, and list items by
 * their unique string `id` (ADR-0024). A path that does not parse or does not resolve is not found.
 */
export function valueAt(document: unknown, path: string): Found {
	const segments = parsePath(path, 0)
	if (isAppError(segments)) return { found: false }
	let current: unknown = document
	for (const segment of segments) {
		current = step(current, segment)
		if (current === undefined) return { found: false }
	}
	return { found: true, value: current }
}

/** One segment's item: an object's own key, or the one list item whose `id` names it. */
function step(current: unknown, segment: string): unknown {
	if (Array.isArray(current)) {
		const matches = current.filter((item) => isPlainObject(item) && item["id"] === segment)
		return matches.length === 1 ? matches[0] : undefined
	}
	if (!isPlainObject(current) || !Object.hasOwn(current, segment)) return undefined
	return current[segment]
}
