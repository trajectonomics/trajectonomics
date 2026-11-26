import { ALLOWANCE_FLAGS, type TaxAllowances } from "./allowances"
import type { Field } from "./claims-values"
import { flagOf, type ReturnClaims } from "./flags"

/** The profile fields a claim set states, in the order the flags are listed. */
const FIELDS: readonly Field[] = ["children", "childrenAtHigherRate", ...ALLOWANCE_FLAGS]

/** The fields whose value is a whole count, so the example value is `<n>` rather than `<amount>`. */
const COUNTS: ReadonlySet<Field> = new Set([
	"children",
	"childrenAtHigherRate",
	"parents",
	"disabledCare",
])

/** Whether any of these claim sets states this field at more than zero. */
function held(sets: readonly ReturnClaims[], field: Field): boolean {
	if (field === "children") return sets.some((set) => set.children > 0)
	if (field === "childrenAtHigherRate") return sets.some((set) => set.childrenAtHigherRate > 0)
	return sets.some((set) => set.allowances[field as keyof TaxAllowances] > 0)
}

/**
 * A flag for every field some of these sets holds, and every field in `also`, naming `person`: `<n>`
 * for a count and `<amount>` for an amount, joined by spaces; `undefined` when there is none. A count
 * flag on its own can be refused beside a kept set's other counts, so the whole command states them
 * all. A person id that starts with `-` takes the `=` form, or its value would read as a flag.
 */
export function exampleFlagsOf(
	sets: readonly ReturnClaims[],
	person: string,
	also: readonly Field[] = [],
): string | undefined {
	const fields = FIELDS.filter((field) => also.includes(field) || held(sets, field))
	if (fields.length === 0) return undefined
	return fields
		.map((field) => {
			const value = `${person}=${COUNTS.has(field) ? "<n>" : "<amount>"}`
			return person.startsWith("-") ? `${flagOf(field)}=${value}` : `${flagOf(field)} ${value}`
		})
		.join(" ")
}
