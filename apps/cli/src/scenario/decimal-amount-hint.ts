import { isPlainObject } from "../json"
import { isDecimalAmount, supportedCurrency } from "../store/money"
import { convertedValuesOf } from "./converted-fields"
import { acceptedScenarioSchemaVersion, type ScenarioProblem } from "./document"
import { moneyPathsOf } from "./field-paths"
import { scenarioShapeProperties } from "./shape"

/*
 * The hint a minor-unit apply or what-if gains when a money field holds the decimal form (issue
 * #227): the value is a decimal string, but the document was read without `--decimal`, so the
 * engine refused it as a non-integer. The offer is made only for a field `--decimal` converts, for
 * a value the `--decimal` parser itself accepts, and only when every other converted field reads
 * the same way under the flag, so the hint and the flag cannot drift.
 */

/** The sentence a minor-unit apply adds when a money field looks like the decimal form. */
export const DECIMAL_AMOUNT_HINT = "This looks like the decimal form: add --decimal."

/** The published document's root, as the schema walk below reads it. */
const SHAPE = {
	type: "object",
	properties: scenarioShapeProperties(acceptedScenarioSchemaVersion()),
}

/** Every money field of the published document, named as a problem's path is: `flows[].amount`. */
const MONEY_PATHS: readonly string[] = moneyPathsOf(SHAPE)

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

/** The Currency `--decimal` would read the document in, or undefined when it would refuse one. */
function currencyOfHint(document: unknown): string | undefined {
	if (!isPlainObject(document)) return undefined
	const currency = document["currency"]
	if (typeof currency !== "string") return undefined
	return supportedCurrency(currency) === null ? currency : undefined
}

/**
 * Whether a field `--decimal` converts holds a quoted string with no dot: the flag would read it as
 * major units, 100 times larger, so following the hint would silently store a wrong value.
 */
function misreadsAnother(document: unknown): boolean {
	return convertedValuesOf(SHAPE, document).some(
		(value) => typeof value === "string" && !value.includes("."),
	)
}

/**
 * The hint for a minor-unit refusal of a money field that holds a value `--decimal` reads, or
 * undefined when the refusal is another one, the field is not money, the value is not decimal, or
 * another converted value would be misread. A string with no dot is a minor-unit amount quoted by
 * mistake: `--decimal` would read it as major units, 100 times larger, while removing the quotes is
 * the fix, so it gets no hint.
 */
export function decimalAmountHint(document: unknown, problem: ScenarioProblem): string | undefined {
	if (problem.code !== "NOT_SAFE_INTEGER") return undefined
	if (!MONEY_PATHS.includes(schemaPathOf(problem.segments))) return undefined
	const value = valueAt(document, problem.segments)
	if (typeof value !== "string") return undefined
	const currency = currencyOfHint(document)
	if (currency === undefined) return undefined
	if (!value.includes(".") || !isDecimalAmount(value, currency)) return undefined
	return misreadsAnother(document) ? undefined : DECIMAL_AMOUNT_HINT
}

/** The first problem's decimal hint, in any order: the refusal shows one problem, which may not be money. */
export function firstDecimalAmountHint(
	document: unknown,
	problems: readonly ScenarioProblem[],
): string | undefined {
	return problems
		.map((problem) => decimalAmountHint(document, problem))
		.find((hint) => hint !== undefined)
}
