import type { ErrorBody } from "../../contract"
import { joinPath, splitPath } from "../document-path"

/**
 * The refusal with the position of an item in its list turned into the item's id: `traj` names `document.flows.1.label`,
 * and the form knows the Flow by its id. `ids` are the ids of the document the Edit sent, in its order, and `list` is the
 * key they sit under (`flows`, `accounts`). A path that already names the item is returned as it is.
 */
export function namedRefusal(
	error: ErrorBody | null,
	ids: readonly string[],
	list = "flows",
): ErrorBody | null {
	if (error?.path === undefined) return error
	const segments = splitPath(error.path)
	const at = segments.indexOf(list)
	const position = segments[at + 1] ?? ""
	const id = /^\d+$/.test(position) ? ids[Number(position)] : undefined
	if (id === undefined) return error
	const named = [...segments]
	named[at + 1] = id
	return { ...error, path: joinPath(named) }
}
