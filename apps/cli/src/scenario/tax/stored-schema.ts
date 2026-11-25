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
 * claim set per Return of a separate filing, and keeps the partner's under another status (cli
 * ADR-0075).
 */
export type StoredTax = {
	tax: TaxJurisdiction
	filingStatus: ThFilingStatus
	children: number
	childrenAtHigherRate: number
	returns?: Record<string, StoredReturn> | undefined
} & { readonly [K in keyof TaxAllowances]?: number | undefined }

/** A person id a Return may be keyed by: the Filer id pattern (tax ADR-0009). */
const PERSON = /^[a-z0-9-]{1,32}$/

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
		returns: z
			.record(z.string().regex(PERSON), storedReturn)
			.optional()
			.describe(
				"One claim set per Return of a separate filing, keyed by person id (cli ADR-0075). Under another filing status it holds only what the partner claimed, which no Levy reads and a later separate filing takes back; the holder's claims are then the keys beside it.",
			),
		...deductionFlags,
	})
	.describe(
		"The tax profile `scenario tax` was given, as the flags state it: each key is a flag's camelCase name, and a deduction left out or stated as zero is absent.",
	)
