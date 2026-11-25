import { toMinorUnits } from "@trajectonomics/core/money"
import { emitThLevy, type ThLevyProfile } from "@trajectonomics/core/tax/th"
import type { Field } from "./claims-values"
import type { ReturnClaims } from "./flags"

/** A profile that claims nothing but this many of one counted field; `null` for an amount field. */
function countedAlone(
	field: Field,
	count: number,
): NonNullable<ThLevyProfile["allowances"]> | null {
	// Every child at the higher rate is the most a count of children can come to.
	const children = { totalCount: count, secondPlusBorn2018OrLaterCount: count }
	if (field === "children" || field === "childrenAtHigherRate") return { children }
	if (field === "parents") return { parents: count }
	return field === "disabledCare" ? { disabledCareCount: count } : null
}

/** Whether a computation of tax-core's, or of the money core's, takes its input. */
function accepts(compute: () => unknown): boolean {
	try {
		compute()
		return true
	} catch {
		return false
	}
}

/**
 * Whether a stated number can be kept and taxed exactly: a count must be a safe integer that tax-core
 * can still compute a Return with, and an amount a safe number of satang.
 */
export function withinCore(field: Field, value: number): boolean {
	const allowances = countedAlone(field, value)
	if (allowances === null) return accepts(() => toMinorUnits(value, 2))
	return Number.isSafeInteger(value) && accepts(() => emitThLevy({ allowances }))
}

/** The counted fields, in the order the flags list them. */
export const COUNTED_FIELDS: readonly Field[] = [
	"children",
	"childrenAtHigherRate",
	"parents",
	"disabledCare",
]

/** Whether tax-core can compute a Return with all of these counts at once. */
export function countsWithinCore(claims: ReturnClaims): boolean {
	const { children, childrenAtHigherRate, allowances } = claims
	return accepts(() =>
		emitThLevy({
			allowances: {
				children: { totalCount: children, secondPlusBorn2018OrLaterCount: childrenAtHigherRate },
				parents: allowances.parents,
				disabledCareCount: allowances.disabledCare,
			},
		}),
	)
}
