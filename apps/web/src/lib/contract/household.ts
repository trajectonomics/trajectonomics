import { z } from "zod"
import { integer } from "./integer"

/** A birth month, as `traj` takes it: `YYYY-MM`. */
const monthText = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

/** The fields every person has. `lifeExpectancy` is always stated: `traj` has no default for it (cli ADR-0048). */
const personBase = {
	id: z.string().min(1),
	// What a page reads in place of the id, such as a name in Thai (sim ADR 0032, cli ADR 0080); no key.
	displayLabel: z.string().optional(),
	born: monthText,
	lifeExpectancy: integer,
}

/** One person of a household, by role: the account holder, a partner, or a dependent. */
export const householdPerson = z.union([
	z.strictObject({ ...personBase, role: z.literal("holder") }),
	z.strictObject({ ...personBase, role: z.literal("partner"), joins: monthText.optional() }),
	z.strictObject({
		...personBase,
		role: z.literal("dependent"),
		relation: z.enum(["child", "parent", "other"]),
	}),
])
export type HouseholdPerson = z.infer<typeof householdPerson>

/** A date of a Scenario item pinned to a person's age, or to a person's life end or joining. */
export const householdAnchor = z.union([
	z.strictObject({ path: z.string().min(1), person: z.string().min(1), age: integer }),
	z.strictObject({
		path: z.string().min(1),
		person: z.string().min(1),
		at: z.enum(["lifeEnd", "joins"]),
	}),
])
export type HouseholdAnchor = z.infer<typeof householdAnchor>

/** Who owns a Flow or an Account: a person id, or `shared` for both partners (cli ADR-0076). */
export const householdOwner = z.strictObject({
	path: z.string().min(1),
	person: z.string().min(1),
})
export type HouseholdOwner = z.infer<typeof householdOwner>

/**
 * The household document of a Scenario (`traj scenario household --json`'s input; cli ADR-0048).
 * Version 2 adds `owners`, which a version 1 household does not carry (cli ADR-0076).
 */
export const householdDocument = z.strictObject({
	schemaVersion: z.union([z.literal(1), z.literal(2)]),
	people: z.array(householdPerson),
	anchors: z.array(householdAnchor),
	owners: z.array(householdOwner).optional(),
})
export type HouseholdDocument = z.infer<typeof householdDocument>
