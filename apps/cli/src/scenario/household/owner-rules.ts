import type { z } from "zod"
import { parsePath } from "../set-parse"
import { type Household, type Owner, SHARED } from "./model"
import { issue } from "./rules"

/**
 * The rules a household's Owners must satisfy (cli ADR-0076), as `rules.ts` states the people's and
 * `anchor-rules.ts` the anchors'. The Scenario's own items are checked where the household is
 * placed, because only a write sees the document.
 */

type Ctx = z.RefinementCtx

/** The lists whose items an Owner may own: Flows (a Contribution is one) and Accounts. */
const OWNABLE = ["flows", "accounts"] as const

/** The dotted path of an ownable item as its two segments, or null when it names none. */
export function ownedSegments(path: string): [string, string] | null {
	const segments = parsePath(path, 0)
	if (!Array.isArray(segments) || segments.length !== 2) return null
	const [list, id] = segments
	if (list === undefined || id === undefined) return null
	return (OWNABLE as readonly string[]).includes(list) ? [list, id] : null
}

/** `owners` belongs to schema version 2 only, and is stated there, as `anchors` is, even when empty. */
function checkPresence(value: Household, ctx: Ctx): void {
	if (value.schemaVersion === 1 && value.owners !== undefined) {
		issue(
			ctx,
			"owners: a version 1 household carries no owners",
			["owners"],
			"Set schemaVersion to 2 to state owners, or remove owners.",
		)
	}
	if (value.schemaVersion === 2 && value.owners === undefined) {
		issue(
			ctx,
			"owners: a version 2 household states owners, an empty list when none",
			["owners"],
			'Add "owners": [] when no item has an Owner.',
		)
	}
}

/** From version 2 the id `shared` is the Owner of both partners, so no person may take it. */
function checkReserved(value: Household, ctx: Ctx): void {
	if (value.schemaVersion !== 2) return
	for (const [index, entry] of value.people.entries()) {
		if (entry.id === SHARED) {
			issue(
				ctx,
				`people.${index}.id: "${SHARED}" is reserved for an item both partners own`,
				["people", index, "id"],
				"Give the person another id.",
			)
		}
	}
}

/** One Owner: it names an ownable item once, and a person who may own it. */
function checkOwner(
	value: Household,
	entry: Owner,
	index: number,
	seen: Set<string>,
	ctx: Ctx,
): void {
	if (ownedSegments(entry.path) === null) {
		issue(
			ctx,
			`owners.${index}.path: "${entry.path}" names no Flow or Account`,
			["owners", index, "path"],
			"Name an item as flows.<id> or accounts.<id>.",
		)
	}
	if (seen.has(entry.path)) {
		issue(ctx, `owners.${index}.path: "${entry.path}" has two Owners`, ["owners", index, "path"])
	}
	seen.add(entry.path)
	if (entry.person === SHARED) return
	const who = value.people.find((candidate) => candidate.id === entry.person)
	if (who === undefined) {
		issue(
			ctx,
			`owners.${index}.person: no person has the id "${entry.person}"`,
			["owners", index, "person"],
			`Name a person id from people, or "${SHARED}".`,
		)
	} else if (who.role === "dependent") {
		issue(
			ctx,
			`owners.${index}.person: "${entry.person}" is a dependent, and a dependent owns nothing`,
			["owners", index, "person"],
			`Name the holder or the partner, or "${SHARED}".`,
		)
	}
}

export function checkOwners(value: Household, ctx: Ctx): void {
	checkPresence(value, ctx)
	checkReserved(value, ctx)
	const seen = new Set<string>()
	for (const [index, entry] of (value.owners ?? []).entries()) {
		checkOwner(value, entry, index, seen, ctx)
	}
}
