import { isDisplayLabel } from "@trajectonomics/core/sim"
import { z } from "zod"
import type { Person } from "./model"

/** A person as a household document states them (cli ADR-0048). The shape only; `rules.ts` holds the rest. */

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

const personId = z
	.string()
	.min(1)
	.describe("The name this household gives the person, unique within it.")
const born = z
	.string()
	.regex(MONTH)
	.describe(
		"The month the person was born, as YYYY-MM. Age N falls on the last day of that month in year born + N.",
	)
const lifeExpectancy = z
	.number()
	.int()
	.min(0)
	.describe(
		"The age at which the person's life ends, as a whole number. Required: there is no default.",
	)

const displayLabel = z
	.string()
	.refine((text) => isDisplayLabel(text), {
		message: "1 to 80 code points, with no control or invisible characters and no edge whitespace",
	})
	.optional()
	.describe(
		"What a page reads in place of the person's id, such as a name in Thai. It is no key: the id still names the person, and the label may repeat or change (sim ADR 0032, cli ADR 0080).",
	)
const holder = z.strictObject({
	id: personId,
	displayLabel,
	role: z.literal("holder").describe("The account holder: exactly one per household."),
	born,
	lifeExpectancy,
})
const partner = z.strictObject({
	id: personId,
	displayLabel,
	role: z.literal("partner").describe("A partner: at most one per household."),
	born,
	lifeExpectancy,
	joins: z
		.string()
		.regex(MONTH)
		.optional()
		.describe(
			"The month the partner joins the plan, as YYYY-MM. Omit it when they are in the plan from the start.",
		),
})
const dependent = z.strictObject({
	id: personId,
	displayLabel,
	role: z.literal("dependent").describe("A dependent: any number per household."),
	relation: z
		.enum(["child", "parent", "other"])
		.describe("How the dependent relates to the holder."),
	born,
	lifeExpectancy,
})

export const person: z.ZodType<Person> = z.discriminatedUnion("role", [holder, partner, dependent])
