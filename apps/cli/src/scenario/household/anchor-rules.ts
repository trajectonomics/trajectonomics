import type { z } from "zod"
import { parsePath } from "../set-parse"
import { anchorableHint, anchorableSegments } from "./anchorable"
import { type Anchor, anchorDate, byId, type Household, type Person } from "./model"
import { issue } from "./rules"

/** The rules a household's anchors cannot state alone (cli ADR-0048), as `rules.ts` states the rest. */

type Ctx = z.RefinementCtx

/** The person an anchor names exists, and a `joins` anchor names a partner who states joins. */
function checkTarget(people: readonly Person[], entry: Anchor, index: number, ctx: Ctx): boolean {
	const who = byId(people).get(entry.person)
	if (who === undefined) {
		issue(
			ctx,
			`anchors.${index}.person: no person has the id "${entry.person}"`,
			["anchors", index, "person"],
			"Name a person id from people.",
		)
		return false
	}
	const joins = "at" in entry && entry.at === "joins"
	if (joins && !(who.role === "partner" && who.joins !== undefined)) {
		issue(
			ctx,
			`anchors.${index}.at: "joins" needs a partner who states joins`,
			["anchors", index, "at"],
			"Only a partner with a joins month can be anchored to it.",
		)
		return false
	}
	return true
}

/** The rule the anchor broke, worded for its kind: a join month has no age or life expectancy. */
function rangeHint(entry: Anchor): string {
	return "at" in entry && entry.at === "joins"
		? "A join month lands in the year it states; keep that year between 0001 and 9998."
		: "An age lands in the year born + age, and a life end in the year born + lifeExpectancy; keep that year between 0001 and 9998."
}

/** The path is a dotted path naming an anchorable date field, and no path is anchored twice. */
function checkPath(entry: Anchor, index: number, seen: Set<string>, ctx: Ctx): void {
	const segments = parsePath(entry.path, 0)
	if (!Array.isArray(segments)) {
		issue(
			ctx,
			`anchors.${index}.path: "${entry.path}" is not a dotted path`,
			["anchors", index, "path"],
			"Escape a literal dot, backslash or equals sign with a backslash.",
		)
	} else if (!anchorableSegments(segments)) {
		issue(
			ctx,
			`anchors.${index}.path: "${entry.path}" names no date field of an item the Scenario holds`,
			["anchors", index, "path"],
			`Anchor one of: ${anchorableHint()}.`,
		)
	}
	if (seen.has(entry.path)) {
		issue(ctx, `anchors.${index}.path: "${entry.path}" is anchored twice`, [
			"anchors",
			index,
			"path",
		])
	}
	seen.add(entry.path)
}

export function checkAnchors(value: Household, ctx: Ctx): void {
	const seen = new Set<string>()
	for (const [index, entry] of value.anchors.entries()) {
		checkPath(entry, index, seen, ctx)
		if (!checkTarget(value.people, entry, index, ctx)) continue
		if (anchorDate(value.people, entry) === null) {
			issue(
				ctx,
				`anchors.${index}: the date falls outside 0001-9998`,
				["anchors", index],
				rangeHint(entry),
			)
		}
	}
}
