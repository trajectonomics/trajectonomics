import { type AppError, isAppError } from "../errors"
import { isPlainObject } from "../json"
import { setValueFromDecimal } from "./decimal-set"
import type { ScenarioDocument } from "./document"
import { formatPath } from "./path"
import { splitAssignment } from "./set-assign"
import type { AppliedOverride } from "./set-error"
import { flagError } from "./set-parse"

/*
 * `--add <list>=<json>` (cli ADR-0062): puts one new item on the end of an id-addressed list of a
 * Scenario document, transiently for a Projection, persisted by `scenario fork` and `scenario apply`.
 * The item must carry its own `id`, which must not already be in the list: `--set` is the flag that
 * changes an item that exists.
 */

/** The lists an item may be added to: the document's lists of plan items (cli ADR-0062). */
export const ADD_LISTS: readonly string[] = ["accounts", "flows", "milestones"]

const LISTS_HINT = `--add takes one of ${ADD_LISTS.join(", ")}, such as --add 'flows={"id":"gym",...}'.`

type ParsedAdd = { list: string; id: string; item: Record<string, unknown>; path: string }

/** One `--add` read: its list, and the item with the id it names. Nothing about the document is read here. */
function parseAdd(raw: string, index: number): ParsedAdd | AppError {
	const parts = splitAssignment(raw, index, "add")
	if (isAppError(parts)) return parts
	if (!ADD_LISTS.includes(parts.path)) {
		return flagError("add", index, `"${parts.path}" is not a list an item can be added to`, {
			hint: LISTS_HINT,
			details: { path: parts.path, lists: [...ADD_LISTS] },
		})
	}
	let value: unknown
	try {
		value = JSON.parse(parts.value)
	} catch {
		return flagError("add", index, `the item for "${parts.path}" is not JSON`, {
			hint: "An --add item is one JSON object that carries its own id.",
			details: { path: parts.path },
		})
	}
	if (!isPlainObject(value)) {
		return flagError("add", index, `the item for "${parts.path}" is not a JSON object`, {
			hint: "An --add item is one JSON object that carries its own id.",
			details: { path: parts.path },
		})
	}
	const id = value["id"]
	if (typeof id !== "string" || id === "") {
		return flagError("add", index, `the item for "${parts.path}" has no id`, {
			hint: "An added item names itself with a string id, so it can be taken out or set later.",
			details: { path: parts.path },
		})
	}
	return { list: parts.path, id, item: value, path: formatPath([parts.path, id]) }
}

/** Refuses an id the list already holds, at the `--add` that names it. */
function idTaken(list: readonly unknown[], parsed: ParsedAdd, index: number): AppError | null {
	const taken = list.some((existing) => isPlainObject(existing) && existing["id"] === parsed.id)
	if (!taken) return null
	return flagError("add", index, `"${parsed.path}" already exists, so it cannot be added`, {
		hint: `--add puts a new item on a list; --set ${parsed.path}.<key>=<value> changes the one that exists.`,
		details: { index, path: parsed.path, list: parsed.list, id: parsed.id },
	})
}

/** One `--add` applied to the document it follows: the document with the item on its list, and the echo. */
function addOne(
	document: ScenarioDocument,
	raw: string,
	index: number,
	decimal: boolean,
): { document: ScenarioDocument; addition: AppliedOverride } | AppError {
	const parsed = parseAdd(raw, index)
	if (isAppError(parsed)) return parsed
	const held = document[parsed.list]
	const list = Array.isArray(held) ? held : []
	const refused = idTaken(list, parsed, index)
	if (refused !== null) return refused
	const segments = [parsed.list, parsed.id]
	const item = decimal
		? setValueFromDecimal(document, index, parsed.path, segments, parsed.item, "add")
		: parsed.item
	if (isAppError(item)) return item
	return {
		document: { ...document, [parsed.list]: [...list, item] },
		addition: { path: parsed.path, value: parsed.item },
	}
}

/**
 * Puts each `--add` item on the end of its list, in command-line order, as one pure function: the
 * copy holds every other node. A list the document leaves out (an optional one) is begun. Under
 * `--decimal` an item's money fields are read as decimal strings, and the echo keeps the item as given.
 */
export function applyAdditions(
	document: ScenarioDocument,
	adds: readonly string[],
	decimal: boolean,
): { document: ScenarioDocument; additions: AppliedOverride[] } | AppError {
	let current = document
	const additions: AppliedOverride[] = []
	for (const [index, raw] of adds.entries()) {
		const added = addOne(current, raw, index, decimal)
		if (isAppError(added)) return added
		current = added.document
		additions.push(added.addition)
	}
	return { document: current, additions }
}
