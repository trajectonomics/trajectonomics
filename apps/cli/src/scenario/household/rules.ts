import type { z } from "zod"
import { yearOf } from "./dates"
import type { Household, Person } from "./model"

/**
 * The rules a household's people must satisfy (cli ADR-0048). Each refusal carries the path it
 * breaks, and a hint where a person can act on it; the anchor rules live in `anchor-rules.ts`.
 */

export type Ctx = z.RefinementCtx

export function issue(ctx: Ctx, message: string, path: (string | number)[], hint?: string): void {
	ctx.addIssue({
		code: "custom",
		message,
		path,
		...(hint === undefined ? {} : { params: { hint } }),
	})
}

function countRole(people: readonly Person[], role: Person["role"]): number {
	return people.filter((entry) => entry.role === role).length
}

/** One holder, at most one partner, unique ids, and a birth year from 0001. */
export function checkPeople(value: Household, ctx: Ctx): void {
	if (countRole(value.people, "holder") !== 1) {
		issue(
			ctx,
			"people: a household has exactly one holder",
			["people"],
			'Give exactly one person the role "holder".',
		)
	}
	if (countRole(value.people, "partner") > 1) {
		issue(
			ctx,
			"people: a household has at most one partner",
			["people"],
			'Only one person may hold the role "partner".',
		)
	}
	const seen = new Set<string>()
	for (const [index, entry] of value.people.entries()) {
		if (seen.has(entry.id)) {
			issue(ctx, `people.${index}.id: "${entry.id}" repeats the id of an earlier person`, [
				"people",
				index,
				"id",
			])
		}
		seen.add(entry.id)
		if (yearOf(entry.born) < 1) {
			issue(
				ctx,
				`people.${index}.born: the year must be 0001 or later`,
				["people", index, "born"],
				"Use a birth year of 0001 or later.",
			)
		}
	}
}
