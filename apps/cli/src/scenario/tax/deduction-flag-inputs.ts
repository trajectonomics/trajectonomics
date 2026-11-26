import { z } from "zod"
import type { TaxAllowances } from "./allowances"

/** One deduction flag: a `[<person>=]<value>` text, repeatable once per Return (cli ADR-0075). */
type DeductionInput = z.ZodOptional<z.ZodArray<z.ZodString>>

/** The deduction flags `scenario tax` accepts, one per allowance a caller can state. */
export type DeductionInputFlags = Record<keyof TaxAllowances, DeductionInput>

/**
 * The deduction flags `scenario tax` accepts, as the caller writes them: a value, or `<person>=<value>`
 * for one Return of a separate filing. Each states an amount the taxpayer paid in the tax year;
 * `@trajectonomics/core/tax` owns every statutory ceiling, so none is restated here.
 */
export const deductionInputFlags: DeductionInputFlags = {
	parents: z
		.array(z.string())
		.optional()
		.describe(
			'Parents aged 60 or over with income of at most 30,000 THB whom the taxpayer supports; needs --tax. Write "<person>=<count>" for one Return of a separate filing.',
		),
	disabledCare: z
		.array(z.string())
		.optional()
		.describe(
			'Relatives with a disability the taxpayer cares for; needs --tax. Write "<person>=<count>" for one Return of a separate filing.',
		),
	socialSecurity: z
		.array(z.string())
		.optional()
		.describe(
			'Social security contributions paid in the tax year, in THB; needs --tax. Write "<person>=<amount>" for one Return of a separate filing.',
		),
	lifeInsurance: z
		.array(z.string())
		.optional()
		.describe(
			'Life insurance premiums paid in the tax year, in THB; needs --tax. Write "<person>=<amount>" for one Return of a separate filing.',
		),
	healthInsurance: z
		.array(z.string())
		.optional()
		.describe(
			'The taxpayer\'s own health insurance premiums, in THB; needs --tax. Write "<person>=<amount>" for one Return of a separate filing.',
		),
	parentHealthInsurance: z
		.array(z.string())
		.optional()
		.describe(
			'Health insurance premiums paid for the taxpayer\'s parents, in THB; needs --tax. Write "<person>=<amount>" for one Return of a separate filing.',
		),
	spouseLifeInsurance: z
		.array(z.string())
		.optional()
		.describe(
			'Life insurance premiums paid for a spouse with no income, in THB; needs --tax and a filing status that allows the spouse allowance. Write "<person>=<amount>" for one Return of a separate filing.',
		),
	mortgageInterest: z
		.array(z.string())
		.optional()
		.describe(
			'Home-loan interest paid in the tax year, in THB; needs --tax. Write "<person>=<amount>" for one Return of a separate filing, or "shared=<amount>" for one loan borrowed together: each separate Return claims half in a year both have income, the only Return with income claims it all, under one ceiling for the loan, beside the interest stated as its own.',
		),
	donation2x: z
		.array(z.string())
		.optional()
		.describe(
			'Donations that the statute counts twice, such as education and hospitals, in THB; needs --tax. Write "<person>=<amount>" for one Return of a separate filing.',
		),
	donation1x: z
		.array(z.string())
		.optional()
		.describe(
			'Donations counted once, in THB; needs --tax. Write "<person>=<amount>" for one Return of a separate filing.',
		),
}
