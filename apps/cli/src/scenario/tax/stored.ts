import { z } from "zod"
import { isPlainObject } from "../../json"
import { canonicalJson } from "../../store/canonical"
import { ALLOWANCE_FLAGS, allowancesOf, type TaxAllowances } from "./allowances"
import { deductionFlags } from "./deduction-flags"
import {
	FILING_STATUSES,
	type TaxJurisdiction,
	type TaxRequest,
	type ThFilingStatus,
} from "./flags"

/**
 * The tax profile a Scenario keeps beside its document (cli ADR-0066): the flags `scenario tax`
 * was given, normalised. The jurisdiction, filing status and children counts always appear, with
 * the defaults the write applied; a deduction appears only when it is more than zero, because a
 * zero states nothing. Each key is the camelCase name of the flag that sets it.
 */
export type StoredTax = {
	tax: TaxJurisdiction
	filingStatus: ThFilingStatus
	children: number
	childrenAtHigherRate: number
} & { readonly [K in keyof TaxAllowances]?: number | undefined }

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
		...deductionFlags,
	})
	.describe(
		"The tax profile `scenario tax` was given, as the flags state it: each key is a flag's camelCase name, and a deduction left out or stated as zero is absent.",
	)

/** The stored profile of a request: every deduction of zero is left out, so equal requests are equal text. */
export function storedTaxOf(request: TaxRequest): StoredTax {
	const stored: { -readonly [K in keyof StoredTax]: StoredTax[K] } = {
		tax: request.jurisdiction,
		filingStatus: request.filingStatus,
		children: request.children,
		childrenAtHigherRate: request.childrenAtHigherRate,
	}
	for (const field of ALLOWANCE_FLAGS) {
		if (request.allowances[field] > 0) stored[field] = request.allowances[field]
	}
	return stored
}

/** The request a stored profile states, with a `0` for each deduction it leaves out. */
export function requestOfStored(stored: StoredTax): TaxRequest {
	return {
		jurisdiction: stored.tax,
		filingStatus: stored.filingStatus,
		children: stored.children,
		childrenAtHigherRate: stored.childrenAtHigherRate,
		allowances: allowancesOf(stored),
	}
}

/** The stored form: RFC 8785 canonical text, as every Scenario row keeps its document. */
export function canonicalTax(stored: StoredTax): string {
	return canonicalJson(stored, "tax")
}

/** The profile a row keeps, parsed from its stored canonical text; a row that holds none gives `null`. */
export function parsedTax(text: string | null): StoredTax | null {
	if (text === null) return null
	const parsed: unknown = JSON.parse(text)
	const checked = storedTax.safeParse(parsed)
	if (!isPlainObject(parsed) || !checked.success) {
		throw new Error("A Scenario row holds a tax profile this build cannot read.")
	}
	return checked.data
}
