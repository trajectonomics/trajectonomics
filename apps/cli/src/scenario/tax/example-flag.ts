import { ALLOWANCE_FLAGS, type TaxAllowances } from "./allowances"
import { flagOf, type ReturnClaims } from "./flags"

/** The profile fields a claim set states, in the order the flags are listed. */
const FIELDS = ["children", "childrenAtHigherRate", ...ALLOWANCE_FLAGS] as const

type Field = (typeof FIELDS)[number]

/** The fields whose value is a whole count, so the example value is `<n>` rather than `<amount>`. */
const COUNTS: ReadonlySet<Field> = new Set([
	"children",
	"childrenAtHigherRate",
	"parents",
	"disabledCare",
])

/** Whether one claim set states this field at more than zero. */
function held(set: ReturnClaims, field: Field): boolean {
	if (field === "children") return set.children > 0
	if (field === "childrenAtHigherRate") return set.childrenAtHigherRate > 0
	return set.allowances[field as keyof TaxAllowances] > 0
}

/**
 * One example flag that states a claim some of these sets holds, naming `person`: the first field
 * held, with `<n>` for a count and `<amount>` for an amount. `--children` stands for a set that
 * holds nothing, so the form is still one the CLI accepts.
 */
export function exampleFlagOf(sets: readonly ReturnClaims[], person: string): string {
	const field = FIELDS.find((name) => sets.some((set) => held(set, name))) ?? "children"
	return `${flagOf(field)} ${person}=${COUNTS.has(field) ? "<n>" : "<amount>"}`
}
