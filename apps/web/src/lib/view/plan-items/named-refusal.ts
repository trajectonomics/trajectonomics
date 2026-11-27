import type { ErrorBody } from "../../contract"

/**
 * The refusal with the position of an item in its list turned into the item's id: `traj` names `document.flows.1.label`,
 * and the form knows the Flow by its id. `ids` are the ids of the document the Edit sent, in its order, and `list` is the
 * key they sit under (`flows`, `accounts`).
 */
export function namedRefusal(
	error: ErrorBody | null,
	ids: readonly string[],
	list = "flows",
): ErrorBody | null {
	if (error?.path === undefined) return error
	const segments = error.path.split(".")
	const at = segments.indexOf(list)
	const id = at < 0 ? undefined : ids[Number(segments[at + 1])]
	if (id === undefined) return error
	return { ...error, path: [...segments.slice(0, at + 1), id, ...segments.slice(at + 2)].join(".") }
}
