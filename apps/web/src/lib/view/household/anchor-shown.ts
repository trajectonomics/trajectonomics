import type { ErrorBody, HouseholdAnchor } from "../../contract"
import { joinPath, localPath, splitPath } from "../document-path"
import { type Problems, type Shown, shownProblems } from "../plan-items/problems"

/** What the last save of the anchor form sent: the anchors of the household, in order, and the path of the one it added. */
export interface SentAnchor {
	readonly anchors: readonly HouseholdAnchor[]
	readonly path: string
}

const FIELDS = ["flow", "edge", "person", "when"]

/** Whether two anchors pin dates of one item: `flows.salary.start` and `flows.salary.end`. */
function oneItem(path: string, other: string): boolean {
	const [section, id] = splitPath(path)
	const [otherSection, otherId] = splitPath(other)
	return section === otherSection && id === otherId
}

/**
 * The refusal with an anchor of the same item named as the one added. `traj` reports a date the plan refuses at the first
 * anchor that wrote into the item, so an end before its start comes back at the start's anchor, though the new one made it.
 */
function atAdded(error: ErrorBody | null, sent: SentAnchor, added: number): ErrorBody | null {
	if (error?.path === undefined) return error
	const [section, position, ...rest] = localPath(splitPath(error.path))
	const whole = rest.length === 0 || (rest.length === 1 && rest[0] === "path")
	const named = sent.anchors[Number(position)]
	if (section !== "anchors" || !whole || named === undefined) return error
	if (!oneItem(named.path, sent.path)) return error
	return { ...error, path: joinPath(["document", "anchors", String(added), "path"]) }
}

/**
 * What the anchor form shows. A refusal of the date the new anchor pins lands on its Age field, and on the form as a whole
 * where the form shows no Age field. A refusal at an anchor of another item is the form's own problem.
 */
export function anchorShown(
	problems: Problems,
	answer: { failure: ErrorBody | null; message: string | null },
	sent: SentAnchor,
	when: string,
): Shown {
	const added = sent.anchors.findIndex((anchor) => anchor.path === sent.path)
	const item = added < 0 ? ["anchors"] : ["anchors", String(added)]
	const fields = when === "age" ? [...FIELDS, "age"] : FIELDS
	const refusal = added < 0 ? answer.failure : atAdded(answer.failure, sent, added)
	return shownProblems(problems, refusal, answer.message, fields, item)
}
