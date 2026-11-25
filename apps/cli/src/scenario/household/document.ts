import { z } from "zod"
import { checkAnchors } from "./anchor-rules"
import { HOUSEHOLD_EXAMPLE } from "./example"
import type { Household } from "./model"
import { checkOwners } from "./owner-rules"
import { person } from "./person-schema"
import { checkPeople } from "./rules"

/**
 * A household document (cli ADR-0048): its shape, then the rules a shape cannot say. A refusal
 * names the document path it breaks, and `traj schema scenario household` prints this schema.
 */

const anchorPath = z
	.string()
	.min(1)
	.describe(
		"A dotted path to a date field of an item the Scenario holds, addressed by its id, such as flows.salary.end.",
	)
const anchorPerson = z
	.string()
	.min(1)
	.describe("The id of the person whose age or date pins the field.")

const anchorAge = z.strictObject({
	path: anchorPath,
	person: anchorPerson,
	age: z
		.number()
		.int()
		.min(0)
		.describe(
			"The age in whole years: the date is the last day of the person's birth month in year born + age.",
		),
})
const anchorAt = z.strictObject({
	path: anchorPath,
	person: anchorPerson,
	at: z
		.enum(["lifeEnd", "joins"])
		.describe(
			"lifeEnd is the person's life expectancy as a date; joins is a partner's join month, on its first day.",
		),
})

const ownerPath = z
	.string()
	.min(1)
	.describe(
		"A dotted path to a Flow or an Account the Scenario holds, as flows.salary or accounts.joint.",
	)
const owner = z.strictObject({
	path: ownerPath,
	person: z
		.string()
		.min(1)
		.describe(
			'The id of the holder or the partner who owns the item, or "shared" when both do. A dependent owns nothing.',
		),
})

const householdShape = z.strictObject({
	schemaVersion: z
		.union([z.literal(1), z.literal(2)])
		.describe("The household's own version: 1, or 2 when it states owners."),
	people: z
		.array(person)
		.describe("Every person the plan names: one holder, at most one partner, and any dependents."),
	anchors: z
		.array(z.union([anchorAge, anchorAt]))
		.describe("The dates pinned to a person's age, to life's end or to a partner's join."),
	owners: z
		.array(owner)
		.optional()
		.describe(
			'Version 2 only, and required there: who owns each Flow or Account, a person id or "shared". An item with no entry has no Owner.',
		),
})

export const householdDocument: z.ZodType<Household> = householdShape
	.superRefine((value, ctx) => {
		checkPeople(value, ctx)
		checkAnchors(value, ctx)
		checkOwners(value, ctx)
	})
	.meta({
		description:
			"A household: the people whose ages pin a Scenario's dates, and from version 2 who owns each Flow or Account. `lifeExpectancy` is required on every person, with no default. Each anchor writes one date into a Scenario item when the household is set. The `examples` entry is one worked example, labelled as such, not a default.",
		examples: [HOUSEHOLD_EXAMPLE],
	})
