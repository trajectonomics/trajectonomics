import { type AppError, fail, isAppError } from "../../errors"
import { type ScenarioDocument, scenarioProblems } from "../document"
import { formatPath } from "../path"
import { parsePath } from "../set-parse"
import { anchoredSegments, employerFollowers } from "./employer"
import { type Anchor, anchorDate, type Household } from "./model"
import { documentPathOf, locate, type Step, setAt } from "./paths"

/** A date one anchor wrote into a Scenario, as `traj scenario household` reports it. */
export type AnchoredDate = { path: string; value: string }

/** A date the employer rule wrote into an employer Contribution, and the path it follows. */
export type FollowedDate = { path: string; value: string; follows: string }

/**
 * One anchor the household write placed, with the item it wrote into. `follower` is the path of the
 * employer Contribution's field when the write is the employer rule's own, not the anchor's.
 */
type Placed = { anchor: Anchor; date: string; item: readonly Step[]; follower?: string }

function isPrefix(prefix: readonly Step[], path: readonly Step[]): boolean {
	return prefix.length <= path.length && prefix.every((step, index) => step === path[index])
}

/**
 * The refusal for a document `sim-core` refuses after the anchors are written, reported at the
 * anchor that wrote into the item the problem names, as `--set` reports at the Set at fault
 * (ADR-0024). Null when the document is accepted.
 */
function refusedAfterPlacing(document: unknown, placed: readonly Placed[], household: Household) {
	const [first] = scenarioProblems(document)
	if (first === undefined) return null
	const cause = placed.find((entry) => isPrefix(entry.item, first.segments))
	if (cause === undefined) {
		const path = documentPathOf(first.segments)
		return fail("invalid_input", {
			path,
			message: `${path}: ${first.code}`,
			details: { code: first.code },
		})
	}
	const index = household.anchors.indexOf(cause.anchor)
	const path = `document.anchors.${index}.path`
	const also =
		cause.follower === undefined
			? ""
			: ` (it also moves ${cause.follower}, the employer's share, per cli ADR-0048)`
	return fail("invalid_input", {
		path,
		message: `${path}: the Scenario refuses ${first.code} once ${cause.anchor.path} is anchored to ${cause.date}${also}`,
		hint: "Change the anchor, or the Scenario's other dates, so that they agree.",
		details: {
			code: first.code,
			anchor: cause.anchor,
			anchored: cause.date,
			...(cause.follower === undefined ? {} : { followed: cause.follower }),
		},
	})
}

/** `household`: writes every anchor's date into the Scenario document, then checks the result. */
export function placeHousehold(
	household: Household,
	document: ScenarioDocument,
): { document: ScenarioDocument; anchored: AnchoredDate[]; followed: FollowedDate[] } | AppError {
	let current: unknown = document
	const placed: Placed[] = []
	const anchored: AnchoredDate[] = []
	const followed: FollowedDate[] = []
	const pinned = anchoredSegments(household.anchors)
	for (const [index, anchor] of household.anchors.entries()) {
		const segments = parsePath(anchor.path, 0)
		if (isAppError(segments)) return segments
		const date = anchorDate(household.people, anchor)
		const locus = locate(current, segments)
		if (date === null) {
			return fail("invalid_input", {
				path: `document.anchors.${index}`,
				message: `document.anchors.${index}: the date falls outside 0001-9998`,
			})
		}
		if (locus.kind === "missing") {
			const path = `document.anchors.${index}.path`
			return fail("invalid_input", {
				path,
				message: `${path}: the Scenario holds no item at ${anchor.path}`,
				hint: "Anchor a Flow or an Account the Scenario holds, or add it with traj scenario apply first.",
				details: { anchor },
			})
		}
		current = setAt(current, locus.at, date)
		placed.push({ anchor, date, item: locus.at.slice(0, -1) })
		// The employer rule (cli ADR-0048): an employer Contribution reading this Flow takes its date.
		for (const follower of employerFollowers(current, segments, pinned)) {
			current = setAt(current, follower.at, date)
			placed.push({ anchor, date, item: follower.at.slice(0, -1), follower: follower.path })
			followed.push({ path: follower.path, value: date, follows: formatPath(segments) })
		}
		anchored.push({ path: formatPath(segments), value: date })
	}
	const refusal = refusedAfterPlacing(current, placed, household)
	if (refusal !== null) return refusal
	return { document: current as ScenarioDocument, anchored, followed }
}
