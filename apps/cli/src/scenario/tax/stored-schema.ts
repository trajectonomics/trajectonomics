import { z } from "zod"
import type { TaxAllowances } from "./allowances"
import { deductionFlags } from "./deduction-flags"
import { FILING_STATUSES, type TaxJurisdiction, type ThFilingStatus } from "./flags"
import { type StoredReturn, storedReturn } from "./stored-return"

/**
 * The tax profile a Scenario keeps beside its document (cli ADR-0066): the flags `scenario tax`
 * was given, normalised. The jurisdiction, filing status and children counts always appear, with
 * the defaults the write applied; a deduction appears only when it is more than zero, because a
 * zero states nothing. Each key is the camelCase name of the flag that sets it. `returns` holds one
 * claim set per Return of a separate filing, and keeps other people's under another status;
 * `claimsHolder` says whose claims the other keys are, and `sharedMortgageInterest` is the interest
 * stated as `--mortgage-interest shared=` (cli ADR-0075).
 */
export type StoredTax = {
	tax: TaxJurisdiction
	filingStatus: ThFilingStatus
	children: number
	childrenAtHigherRate: number
	claimsHolder?: string | undefined
	returns?: Record<string, StoredReturn> | undefined
	sharedMortgageInterest?: number | undefined
} & { readonly [K in keyof TaxAllowances]?: number | undefined }

/** A household's name for a person. It need not fit a Filer's id: a person with no Return keeps claims. */
const person = z.string().min(1)

/** The stored profile's shape, which `scenario show` prints and `traj schema` publishes. */
export const storedTax: z.ZodType<StoredTax> = z
	.strictObject({
		tax: z.enum(["th-2026"]).describe("The jurisdiction the Levy was written for (--tax)."),
		filingStatus: z
			.enum(FILING_STATUSES)
			.describe("The taxpayer's filing status (--filing-status)."),
		children: z
			.number()
			.int()
			.min(0)
			.describe("Children counted for the child allowance (--children)."),
		childrenAtHigherRate: z
			.number()
			.int()
			.min(0)
			.describe("Children born 2018 or later, a subset of children (--children-at-higher-rate)."),
		claimsHolder: person
			.optional()
			.describe(
				"The household person whose claims the keys beside it are (cli ADR-0075), so they stay theirs if the household swaps which person is the holder. Absent for a plan that never had Filers: the claims are then the holder's.",
			),
		returns: z
			.record(person, storedReturn)
			.optional()
			.describe(
				"One claim set per Return of a separate filing, keyed by person id (cli ADR-0075). Under another filing status it holds what people other than `claimsHolder` claimed, which no Levy reads and a later separate filing takes back; that person's claims are the keys beside it.",
			),
		sharedMortgageInterest: z
			.number()
			.min(0)
			.optional()
			.describe(
				"Home-loan interest on one loan borrowed together, in THB, as --mortgage-interest shared= states it: each separate Return claims half beside its own mortgageInterest, an odd satang going to the holder, and a sole Filer claims it all (cli ADR-0075). Under another filing status it is kept and no Levy reads it.",
			),
		...deductionFlags,
	})
	.describe(
		"The tax profile `scenario tax` was given, as the flags state it: each key is a flag's camelCase name, and a deduction left out or stated as zero is absent.",
	)
