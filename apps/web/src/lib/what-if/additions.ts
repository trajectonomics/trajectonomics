/**
 * The Additions a what-if carries: a new list item, put on `flows`, `accounts` or `milestones` by its own id
 * (`--add <list>=<json>`, [cli ADR 0062](../../../../cli/docs/adr/0062-a-what-if-adds-a-list-item-by-its-own-id-after-the-removals-and-before-the-sets.md)).
 * Pure: the closed shape the server and the Edits share. The item travels as one argv token after
 * `--add=<list>=`, so no value can be read as a flag; its id passes the plan-name rules all the same.
 */
import { z } from "zod"
import { allowanceName } from "../contract/allowance-labels"
import { planNameShapeError } from "../edit/name"
import { type Json, jsonValue } from "./json"

/** The lists an item may be added to; a Levy is written by `scenario tax`, so it is not one (cli ADR 0062). */
export const ADDABLE_LISTS = ["flows", "accounts", "milestones"] as const

/** The most Additions one what-if carries: a suggestion adds one Flow per allowance, and the page sends no more. */
export const MAX_ADDITIONS = 50

const item = z
	.record(z.string(), jsonValue)
	.refine(
		(value) =>
			typeof value["id"] === "string" &&
			value["id"] !== "" &&
			planNameShapeError(value["id"]) === null,
		{ message: "an added item names itself with an id traj can take" },
	)

/** One Addition: the list and the item. Strict: no other field. */
export const additionSchema = z.strictObject({ list: z.enum(ADDABLE_LISTS), item })

/** One Addition. */
export type Addition = { list: (typeof ADDABLE_LISTS)[number]; item: Record<string, Json> }

/** The id of an added item, or an empty text when it has none (the schema refuses such an item). */
export function additionId(addition: Addition): string {
	const id = addition.item["id"]
	return typeof id === "string" ? id : ""
}

/** The path of an Addition in the Override grammar: `flows.<id>`, which a refusal names in `details.path`. */
export function additionPath(addition: Addition): string {
	return `${addition.list}.${additionId(addition)}`
}

/** The Additions of a what-if or an Edit: at most one per list and id, since `traj` refuses an id twice. */
export const additionsSchema = z
	.array(additionSchema)
	.max(MAX_ADDITIONS)
	.refine((all) => new Set(all.map((one) => additionPath(one))).size === all.length, {
		message: "an item is added more than once",
	})

/**
 * How the session's list names an Addition: an allowance's Flow reads "Added RMF contribution, 2026" from its
 * own label and start year, any other item "Added flow <id>". Text only; the id stays in the change's `title`.
 */
export function additionWords(addition: Addition): string {
	const { label, start } = addition.item
	const name = typeof label === "string" ? allowanceName(label) : null
	if (name === null || name === label || typeof start !== "string") {
		return `Added ${addition.list.replace(/s$/, "")} ${additionId(addition)}`
	}
	return `Added ${name} contribution, ${start.slice(0, 4)}`
}
