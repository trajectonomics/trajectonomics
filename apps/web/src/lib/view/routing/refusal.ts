/**
 * Where a `traj` refusal lands on the Where money goes page. The CLI names the place in its path: a routing row by its
 * position (`document.cashflow.withdraw.1.downTo`, `document.cashflow.surplus.2.share`; the two lists have no id, cli ADR
 * 0070) and a transfer by its position or its id (`document.flows.3.target`, `document.flows.move.source`). A what-if
 * names the same place in `details.documentPath` and puts `--set` in `path`. The message is the CLI's, shown as it is.
 */
import type { ErrorBody } from "../../contract"
import { localPath, splitPath } from "../document-path"
import type { ListName } from "./entries"

/** A row of a routing list: its list, its position and the field its path ends in. */
export type RowPlace = { kind: "row"; list: ListName; index: number; field: string }
/** A transfer by its id, and the field its path ends in. */
export type FlowPlace = { kind: "flow"; id: string; field: string }
export type Place = RowPlace | FlowPlace

const LISTS: readonly string[] = ["surplus", "contribute", "withdraw"]

/** The document path a refusal names, whether an Edit's `path` or a what-if's `details.documentPath`. */
export function documentPathOf(error: ErrorBody | null): string[] {
	const details = error?.details
	const fromDetails =
		typeof details === "object" && details !== null && "documentPath" in details
			? String((details as { documentPath: unknown }).documentPath)
			: ""
	const named = error?.path ?? ""
	const path = named === "" || splitPath(named)[0] !== "document" ? fromDetails : named
	return path === "" ? [] : [...localPath(splitPath(path))]
}

/** The field a path ends in; a path through `derive` or `growth` names the field the form shows it at. */
function fieldOf(rest: readonly string[]): string {
	if (rest.includes("derive")) return rest.includes("source") ? "source" : "share"
	if (rest.includes("growth")) return "rate"
	return rest.at(-1) ?? ""
}

/** Where a refusal lands. `sent` holds the ids of the Flows of the document the Edit sent, in order. */
export function placeOf(error: ErrorBody | null, sent: readonly string[]): Place | null {
	const [head, list, ref, ...rest] = documentPathOf(error)
	if (
		head === "cashflow" &&
		list !== undefined &&
		LISTS.includes(list) &&
		/^\d+$/.test(ref ?? "")
	) {
		return { kind: "row", list: list as ListName, index: Number(ref), field: rest.at(-1) ?? "" }
	}
	if (head !== "flows" || list === undefined) return null
	const id = /^\d+$/.test(list) ? sent[Number(list)] : list
	return id === undefined ? null : { kind: "flow", id, field: fieldOf([ref ?? "", ...rest]) }
}
