import { z } from "zod"
import { integer } from "./integer"

/** An amount of the tax profile in baht, as `traj scenario tax` was given it; a count of people is an integer. */
const amount = z.number().min(0)

/**
 * The tax profile `traj scenario tax` keeps beside a Scenario (cli ADR-0066): the flags it was given,
 * each key a flag's camelCase name. A deduction left out, or stated as zero, is absent. `traj` parses
 * every amount, so a page only reads this back; it never writes it as JSON.
 */
export const taxProfile = z.strictObject({
	tax: z.literal("th-2026"),
	filingStatus: z.enum([
		"single",
		"married_no_income_spouse",
		"married_separate",
		"married_joint",
		"married_separate_40_1_joint_rest",
	]),
	children: integer,
	childrenAtHigherRate: integer,
	parents: integer.optional(),
	disabledCare: integer.optional(),
	socialSecurity: amount.optional(),
	lifeInsurance: amount.optional(),
	healthInsurance: amount.optional(),
	parentHealthInsurance: amount.optional(),
	spouseLifeInsurance: amount.optional(),
	mortgageInterest: amount.optional(),
	donation2x: amount.optional(),
	donation1x: amount.optional(),
})
export type TaxProfile = z.infer<typeof taxProfile>

/**
 * Which deduction classes a taxed plan states and which it does not, as `scenario show` reports them (cli ADR-0073): the
 * same lists `scenario tax` prints as `allowances`. A class is a name, kept as it is: a class a later `traj` adds still decodes,
 * and the view model places the ones it knows.
 */
export const taxAllowances = z.strictObject({
	stated: z.array(z.string()),
	notStated: z.array(z.string()),
})
export type TaxAllowances = z.infer<typeof taxAllowances>

/**
 * The tax fields of `scenario show`, all optional so a Snapshot saved by an earlier build still decodes: the stored profile (null
 * when none, cli ADR-0066), whether the document holds a Levy, and `taxAllowances`, absent when the plan is untaxed or holds a Levy
 * with no stored profile (cli ADR-0073).
 */
export const taxShown = {
	tax: taxProfile.nullable().optional(),
	taxed: z.boolean().optional(),
	taxAllowances: taxAllowances.optional(),
}
