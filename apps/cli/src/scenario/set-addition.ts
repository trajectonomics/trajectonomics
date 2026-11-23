import { type AppError, isAppError } from "../errors"
import { isPlainObject } from "../json"
import { setValueFromDecimal } from "./decimal-set"
import type { ScenarioDocument } from "./document"
import { removedByCall } from "./set-add-order"
import { type ParsedAdd, parseAdd } from "./set-add-parse"
import type { AppliedOverride } from "./set-error"
import { flagError } from "./set-parse"

/*
 * `--add <list>=<json>` (cli ADR-0062): puts one new item on the end of an id-addressed list of a
 * Scenario document, transiently for a Projection, persisted by `scenario fork` and `scenario apply`.
 * The item must carry its own `id`, which must not already be in the list and must not be one the same
 * call's `--without` took out: `--set` is the flag that changes an item that exists.
 */

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
	removed: readonly string[],
): { document: ScenarioDocument; addition: AppliedOverride } | AppError {
	const parsed = parseAdd(raw, index)
	if (isAppError(parsed)) return parsed
	const replaced = removedByCall(parsed, index, removed)
	if (replaced !== null) return replaced
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
 * `removed` holds the paths this call's `--without` took out, so an `--add` cannot bring one back.
 */
export function applyAdditions(
	document: ScenarioDocument,
	adds: readonly string[],
	decimal: boolean,
	removed: readonly string[] = [],
): { document: ScenarioDocument; additions: AppliedOverride[] } | AppError {
	let current = document
	const additions: AppliedOverride[] = []
	for (const [index, raw] of adds.entries()) {
		const added = addOne(current, raw, index, decimal, removed)
		if (isAppError(added)) return added
		current = added.document
		additions.push(added.addition)
	}
	return { document: current, additions }
}
