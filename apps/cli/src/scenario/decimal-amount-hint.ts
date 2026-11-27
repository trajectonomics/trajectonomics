import { isPlainObject } from "../json"
import type { ScenarioProblem } from "./document"

/*
 * The hint a minor-unit apply gains when a money field holds the decimal form (issue #227): the
 * value is a decimal string, but the document was read without `--decimal`, so the engine refused
 * it as a non-integer. The offer is made only for a field `--decimal` converts: a decimal string in
 * a count or a rate it leaves as stored would not be fixed by the flag.
 */

/** The sentence a minor-unit apply adds when a money field looks like the decimal form. */
export const DECIMAL_AMOUNT_HINT = "This looks like the decimal form: add --decimal."

/** A decimal amount: an optional minus, digits, one dot and one or two places, as "9000.50". */
const DECIMAL_AMOUNT = /^-?(0|[1-9][0-9]*)\.[0-9]{1,2}$/

/** The document path as the published schema names it: a list item is `[]`, so `flows[].amount`. */
function schemaPathOf(segments: readonly (string | number)[]): string {
	let path = ""
	for (const segment of segments) {
		if (typeof segment === "number") path += "[]"
		else path = path === "" ? segment : `${path}.${segment}`
	}
	return path
}

/** The value a document path names, or undefined when the document has none there. */
function valueAt(value: unknown, segments: readonly (string | number)[]): unknown {
	let current = value
	for (const segment of segments) {
		if (Array.isArray(current)) current = typeof segment === "number" ? current[segment] : undefined
		else if (isPlainObject(current)) current = current[String(segment)]
		else return undefined
	}
	return current
}

/**
 * The hint for a minor-unit refusal of a money field that holds a decimal string, or undefined
 * when the refusal is another one, the field is not money, or the value is not decimal-shaped.
 */
export function decimalAmountHint(
	document: unknown,
	problem: ScenarioProblem,
	moneyPaths: readonly string[],
): string | undefined {
	if (problem.code !== "NOT_SAFE_INTEGER") return undefined
	if (!moneyPaths.includes(schemaPathOf(problem.segments))) return undefined
	const value = valueAt(document, problem.segments)
	return typeof value === "string" && DECIMAL_AMOUNT.test(value) ? DECIMAL_AMOUNT_HINT : undefined
}
