import { type AppError, fail, isAppError } from "../../errors"
import { parsePath } from "../set-parse"
import type { ConflictHint } from "./conflict-hint"
import { anchoredSegments, employerFollowers } from "./employer"
import { type Anchor, anchorDate, canonicalHousehold, type Household } from "./model"
import { resolveOwners } from "./owner-held"
import { documentPathOf, locate, type Step, setAt } from "./paths"
import { refusesWithout } from "./required"
import { storedHousehold } from "./stored"

/**
 * The resolution of a stored household's anchors onto an incoming Scenario document, for `apply`
 * and `fork` (cli ADR-0048). Pure: the store calls it inside its own write, so a Scenario and its
 * household are read and written as one.
 */

/** The anchors a document took, the household that keeps them, and the paths whose item is gone. */
export type ResolvedAnchors = {
	document: unknown
	/** The household's canonical text with only the anchors that still resolve; null when none. */
	household: string | null
	/** The anchor paths whose item the incoming document no longer holds. */
	dropped: string[]
	/** The Owner paths whose Flow or Account the incoming document no longer holds (cli ADR-0076). */
	droppedOwners: string[]
}

/**
 * The refusal for a value that differs from its anchor. It names the document path of the value,
 * and the household that would move it.
 */
function conflict(
	hint: ConflictHint,
	anchor: Anchor,
	date: string,
	at: readonly Step[],
	value: unknown,
	document: unknown,
) {
	const path = documentPathOf(at)
	return fail("invalid_input", {
		path,
		message: `${path}: ${anchor.path} is anchored to ${date} by the household, and this value differs`,
		hint: hint(refusesWithout(document, at)),
		details: { anchor, anchored: date, value },
	})
}

/** What one anchor does to the incoming document: it writes or keeps a value, or its item is gone. */
type Outcome = { document: unknown } | { dropped: true }

function resolveOne(
	household: Household,
	pinned: readonly (readonly string[])[],
	anchor: Anchor,
	document: unknown,
	hint: ConflictHint,
): Outcome | AppError {
	const segments = parsePath(anchor.path, 0)
	if (isAppError(segments)) return segments
	// A validated household's anchors always resolve, so a null date is a bug, not a caller's input.
	const date = anchorDate(household.people, anchor)
	if (date === null) return fail("internal")
	const locus = locate(document, segments)
	if (locus.kind === "missing") return { dropped: true }
	if (locus.kind === "found") {
		if (locus.value !== date) return conflict(hint, anchor, date, locus.at, locus.value, document)
		return { document }
	}
	return { document: fillFollowers(setAt(document, locus.at, date), segments, date, pinned) }
}

/**
 * A filled date also fills the same field of each employer Contribution reading that Flow (the
 * employer rule, cli ADR-0048), but only where the document states none: a stated value is never
 * rewritten here, because this path refuses a value rather than move it.
 */
function fillFollowers(
	document: unknown,
	segments: readonly string[],
	date: string,
	pinned: readonly (readonly string[])[],
): unknown {
	let current = document
	for (const follower of employerFollowers(current, segments, pinned)) {
		if (locate(current, follower.segments).kind === "absent") {
			current = setAt(current, follower.at, date)
		}
	}
	return current
}

/**
 * `apply` and `fork`: the anchors a stored household holds, resolved onto an incoming document
 * before the document is checked. A missing field is filled, an equal one kept, an item the document
 * no longer holds drops its anchor, and a different value is refused at its path.
 */
export function resolveHousehold(
	stored: string,
	document: unknown,
	hint: ConflictHint,
): ResolvedAnchors | AppError {
	// A row written by `scenario household` always parses; a corrupt one is the internal failure.
	const household = storedHousehold(stored)
	if (isAppError(household)) return household
	const pinned = anchoredSegments(household.anchors)
	let current: unknown = document
	const kept: Anchor[] = []
	const dropped: string[] = []
	for (const anchor of household.anchors) {
		const outcome = resolveOne(household, pinned, anchor, current, hint)
		if (isAppError(outcome)) return outcome
		if ("dropped" in outcome) {
			dropped.push(anchor.path)
			continue
		}
		current = outcome.document
		kept.push(anchor)
	}
	// A version 1 household has no owners, so its bytes stay as they were (cli ADR-0076).
	const { owners, dropped: droppedOwners } = resolveOwners(household, current)
	return {
		document: current,
		household: canonicalHousehold({
			...household,
			anchors: kept,
			...(owners === undefined ? {} : { owners }),
		}),
		dropped,
		droppedOwners,
	}
}
