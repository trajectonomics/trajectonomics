import { z } from "zod"
import { ALLOWANCE_FLAGS, allowancesOf, type TaxAllowances } from "./allowances"
import { deductionFlags } from "./deduction-flags"
import type { ReturnClaims } from "./flags"

/**
 * One Return of a separate filing in the stored profile (cli ADR-0075): the children counts, always
 * present, and each deduction only when it is more than zero, as the flat profile states them.
 */
export type StoredReturn = {
	children: number
	childrenAtHigherRate: number
} & { readonly [K in keyof TaxAllowances]?: number | undefined }

/** The stored shape of one Return's claims, published by `scenario show` and `traj schema`. */
export const storedReturn: z.ZodType<StoredReturn> = z
	.strictObject({
		children: z.number().int().min(0).describe("Children this Return counts (--children)."),
		childrenAtHigherRate: z
			.number()
			.int()
			.min(0)
			.describe("Children born 2018 or later this Return counts (--children-at-higher-rate)."),
		...deductionFlags,
	})
	.describe(
		"The allowances one Return claims: the children counts always, and each deduction only when it is more than zero.",
	)

/** The stored claims of one Return: every deduction of zero is left out, so equal claims are equal text. */
export function storedReturnOf(claims: ReturnClaims): StoredReturn {
	const stored: { -readonly [K in keyof StoredReturn]: StoredReturn[K] } = {
		children: claims.children,
		childrenAtHigherRate: claims.childrenAtHigherRate,
	}
	for (const field of ALLOWANCE_FLAGS) {
		if (claims.allowances[field] > 0) stored[field] = claims.allowances[field]
	}
	return stored
}

/** The claims a stored Return states, with a `0` for each deduction it leaves out. */
export function returnOfStored(stored: StoredReturn): ReturnClaims {
	return {
		children: stored.children,
		childrenAtHigherRate: stored.childrenAtHigherRate,
		allowances: allowancesOf(stored),
	}
}
