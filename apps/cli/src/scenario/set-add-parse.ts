import { type AppError, isAppError } from "../errors"
import { isPlainObject } from "../json"
import { formatPath } from "./path"
import { splitAssignment } from "./set-assign"
import { flagError } from "./set-parse"

/** The lists an item may be added to: the document's lists of plan items (cli ADR-0062). */
const ADD_LISTS: readonly string[] = ["accounts", "flows", "milestones"]

const LISTS_HINT = `--add takes one of ${ADD_LISTS.join(", ")}, such as --add 'flows={"id":"gym",...}'.`

export type ParsedAdd = { list: string; id: string; item: Record<string, unknown>; path: string }

/** One `--add` read: its list, and the item with the id it names. Nothing about the document is read here. */
export function parseAdd(raw: string, index: number): ParsedAdd | AppError {
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
