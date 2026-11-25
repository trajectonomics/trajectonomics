import { type AppError, fail } from "../../errors"
import { ALLOWANCE_FLAGS, type TaxAllowances } from "./allowances"
import { flagOf, type TaxFlags } from "./flags"

/** A profile field a caller states: the two children counts, or one deduction. */
export type Field = "children" | "childrenAtHigherRate" | keyof TaxAllowances

/** Every stated value: the field, then the person (`""` for a bare value, which names the holder). */
export type Stated = Map<Field, Map<string, number>>

const COUNT = /^\d+$/
const AMOUNT = /^\d+(?:\.\d+)?$/
const COUNT_FIELDS: ReadonlySet<string> = new Set([
	"children",
	"childrenAtHigherRate",
	"parents",
	"disabledCare",
])

/** The fields the flags may state, in the order a refusal names them. */
export function fields(): readonly Field[] {
	return ["children", "childrenAtHigherRate", ...ALLOWANCE_FLAGS]
}

/** One stated value as the number its field takes, or the refusal that names the flag. */
function numberOf(field: Field, text: string): number | AppError {
	const count = COUNT_FIELDS.has(field)
	if ((count ? COUNT : AMOUNT).test(text)) return Number(text)
	return fail("invalid_input", {
		path: field,
		message: `${flagOf(field)}: "${text}" is not ${count ? "a whole count of zero or more" : "an amount of zero or more"}.`,
		hint: count
			? "Give a whole number, such as 1."
			: "Give a plain decimal, such as 9000 or 9000.50.",
	})
}

/** One `[<person>=]<value>` flag value written into `into`. */
function statedOne(field: Field, text: string, into: Stated): AppError | null {
	const at = text.indexOf("=")
	const person = at > 0 ? text.slice(0, at) : ""
	const parsed = numberOf(field, at > 0 ? text.slice(at + 1) : text)
	if (typeof parsed !== "number") return parsed
	const values = into.get(field) ?? new Map<string, number>()
	if (values.has(person)) {
		return fail("invalid_input", {
			path: field,
			message: `${flagOf(field)} states ${person === "" ? "a bare value" : `"${person}"`} twice.`,
			hint: "State each person's value once, as --parents 1 for the holder or --parents partner=1.",
		})
	}
	values.set(person, parsed)
	into.set(field, values)
	return null
}

/** The profile values the flags state, or the refusal that names the flag that cannot be read. */
export function claimsOf(flags: TaxFlags): Stated | AppError {
	const stated: Stated = new Map()
	for (const field of fields()) {
		for (const text of flags[field] ?? []) {
			const problem = statedOne(field, text, stated)
			if (problem !== null) return problem
		}
	}
	return stated
}
