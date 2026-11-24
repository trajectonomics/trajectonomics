import { isAppError } from "../../errors"
import { isPlainObject } from "../../json"
import { formatPath } from "../path"
import { parsePath } from "../set-parse"
import type { Anchor } from "./model"
import type { Step } from "./paths"

/**
 * The employer rule of cli ADR-0048: an anchor on a Flow's date field also moves every employer
 * Contribution that reads that Flow's gross. It is read from the document's own shape, never from an
 * id: a Contribution follows a Flow when its `funding` is `employer` and every `flow` Measure of its
 * `derive` names that Flow, and it takes the anchored field with exactly the Flow's value.
 */

/** The ids of the Flows a `derive` graph reads through a `flow` Measure. */
function flowsRead(derive: unknown): Set<string> {
	const read = new Set<string>()
	if (!isPlainObject(derive) || !Array.isArray(derive["measures"])) return read
	for (const measure of derive["measures"]) {
		if (isPlainObject(measure) && measure["op"] === "flow" && typeof measure["flow"] === "string") {
			read.add(measure["flow"])
		}
	}
	return read
}

/** Whether `flow` is an employer Contribution whose `derive` reads `salary` and no other Flow. */
function followsSalary(flow: unknown, salary: string): boolean {
	if (!isPlainObject(flow)) return false
	if (flow["kind"] !== "contribution" || flow["funding"] !== "employer") return false
	if (flow["id"] === salary) return false
	const read = flowsRead(flow["derive"])
	return read.size === 1 && read.has(salary)
}

const keyOf = (segments: readonly string[]) => segments.join("\u0000")

/** An employer Contribution's date field the rule moves: where it sits in the document, and its path. */
export type Follower = { at: Step[]; segments: string[]; path: string }

/**
 * The addresses of the date field an anchor at `segments` also moves: that field on every employer
 * Contribution reading the anchored Flow. An anchor on the Contribution's own field wins over the rule,
 * so the household can still pin it apart.
 */
export function employerFollowers(
	document: unknown,
	segments: readonly string[],
	anchored: readonly (readonly string[])[],
): Follower[] {
	const [list, salary, field] = segments
	if (list !== "flows" || segments.length !== 3 || salary === undefined || field === undefined) {
		return []
	}
	if (!isPlainObject(document) || !Array.isArray(document["flows"])) return []
	const pinned = new Set(anchored.map(keyOf))
	const out: Follower[] = []
	for (const [position, flow] of document["flows"].entries()) {
		if (!followsSalary(flow, salary)) continue
		const id = (flow as Record<string, unknown>)["id"]
		if (typeof id !== "string" || pinned.has(keyOf(["flows", id, field]))) continue
		const own = ["flows", id, field]
		out.push({ at: ["flows", position, field], segments: own, path: formatPath(own) })
	}
	return out
}

/** The paths a household's anchors name, as segments, for `employerFollowers`. */
export function anchoredSegments(anchors: readonly Anchor[]): (readonly string[])[] {
	const out: (readonly string[])[] = []
	for (const anchor of anchors) {
		const segments = parsePath(anchor.path, 0)
		if (!isAppError(segments)) out.push(segments)
	}
	return out
}
