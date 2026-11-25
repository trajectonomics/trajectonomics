/**
 * The Overrides a what-if carries: Sets (a value that replaces an existing dotted path) and Removals (a
 * list item taken out by its id), as `traj` reads them ([cli ADR 0056](../../../../cli/docs/adr/0056-a-what-if-takes-a-list-item-out-and-reads-its-amounts-in-major-units.md)).
 * Pure: the closed list the server and the Edits share. A path or an id passes the same name rules as a
 * plan name (`planNameShapeError`), so no value can be read as a flag.
 */
import { z } from "zod"
import { planNameShapeError } from "../edit/name"
import { additionsSchema } from "./additions"
import { type Json, jsonValue } from "./json"

export type { Json }

/** The most Sets or Removals one what-if carries: the page sends one per changed field. */
export const MAX_OVERRIDES = 50

/** The longest path a Set names. */
export const MAX_PATH = 200

/** The lists a Removal may name: one item of one of them, by its id (cli ADR 0056). */
export const REMOVABLE_LISTS = ["flows", "accounts", "milestones"] as const

/** Why a path cannot travel as one `--set=<path>=<json>` token, or null when it can. */
export function pathShapeError(path: string): string | null {
	if (path.includes("=")) return "A path cannot hold =."
	if (path.length > MAX_PATH) return `A path is at most ${MAX_PATH} characters.`
	return planNameShapeError(path)
}

/** A Removal names one item of a list: `flows.gym`, never a whole list or an index. */
export function removalShapeError(path: string): string | null {
	const shape = pathShapeError(path)
	if (shape !== null) return shape
	const pattern = new RegExp(`^(${REMOVABLE_LISTS.join("|")})\\.[^.]+$`)
	return pattern.test(path) ? null : "A removal names one list item, such as flows.gym."
}

const pathSchema = z
	.string()
	.min(1)
	.refine((path) => pathShapeError(path) === null, {
		message: "not a path traj can take",
	})

const removalSchema = z
	.string()
	.min(1)
	.refine((path) => removalShapeError(path) === null, {
		message: "not a removal traj can take",
	})

/** One Set: a dotted path and the JSON value that replaces it. Strict: no other field. */
export const setSchema = z.strictObject({ path: pathSchema, value: jsonValue })

/** One Set. */
export type SetChange = z.infer<typeof setSchema>

/** The Sets of a what-if or an Edit: at most one per path, since `traj` refuses a repeated path. */
const setsSchema = z
	.array(setSchema)
	.max(MAX_OVERRIDES)
	.refine((sets) => new Set(sets.map((set) => set.path)).size === sets.length, {
		message: "a path is set more than once",
	})

/** The Removals of a what-if or an Edit: at most one per id. */
const removalsSchema = z
	.array(removalSchema)
	.max(MAX_OVERRIDES)
	.refine((removals) => new Set(removals).size === removals.length, {
		message: "an item is removed more than once",
	})

/** The Sets and Removals of an Edit that copies or applies a what-if. */
export const overridesFields = {
	sets: setsSchema,
	removals: removalsSchema,
	additions: additionsSchema,
}

/** The body of `POST /what-if`: a plan and its Overrides. Strict: any other field is refused. */
export const whatIfSchema = z.strictObject({
	plan: z
		.string()
		.min(1)
		.refine((name) => planNameShapeError(name) === null, {
			message: "not a plan name traj can take",
		}),
	sets: setsSchema,
	removals: removalsSchema,
	// An older page sends none; `traj` reads the Additions after the removals and before the Sets (cli ADR 0062).
	additions: additionsSchema.default([]),
})

/** One what-if as the page sends it. */
export type WhatIfBody = z.infer<typeof whatIfSchema>
