import { z } from "zod"
import { isAppError } from "../errors"
import { toDecimalForm } from "./decimal"
import { isNode, moneyUnitOf, type Node, PUBLISHED, rateUnitOf } from "./money-fields"
import { percentRanges } from "./percent"
import { DECIMAL_UNITS_SENTENCE, MINOR_UNITS_SENTENCE } from "./shape/description"
import { DECIMAL_UNITS } from "./shape/terms"

/*
 * The decimal form as `traj schema` publishes it (ADR-0047): the minor-unit form's own schema with
 * each money field a decimal string. Its description is the same field's, with only the unit changed.
 */

/** A plain decimal: an optional minus, no grouping commas, no exponent, no leading `+`. */
const DECIMAL_PATTERN = "^-?(0|[1-9][0-9]*)(\\.[0-9]+)?$"

/** The `--decimal` flag of `show` and `apply`: the form `show --decimal` prints and `apply` reads. */
export const decimalFlag: z.ZodOptional<z.ZodBoolean> = z
	.boolean()
	.optional()
	.describe(
		'Money as decimal strings of the Currency\'s major unit, such as "350.00", not integer minor units (ADR-0047).',
	)

/** A plain percent: an optional minus, no grouping, no exponent; the CLI refuses a third place that is not zero. */
const PERCENT_PATTERN = "^-?(0|[1-9][0-9]*)(\\.[0-9]+)?$"

/** A schema node in the decimal form: a money field or a rule's rate becomes a string with its unit stated. */
function decimalNode(node: unknown): unknown {
	if (Array.isArray(node)) return node.map(decimalNode)
	if (!isNode(node)) return node
	const copy = Object.fromEntries(
		Object.entries(node).map(([key, value]) => [key, decimalNode(value)]),
	)
	const unit = moneyUnitOf(node)
	if (unit !== undefined) {
		const rest = String(node["description"]).slice(unit.length)
		return {
			...copy,
			type: "string",
			pattern: DECIMAL_PATTERN,
			description: `${DECIMAL_UNITS}${rest}`,
		}
	}
	const rate = rateUnitOf(node)
	if (rate === undefined) return copy
	const rest = String(node["description"]).slice(rate.stored.length)
	return {
		...copy,
		type: "string",
		pattern: PERCENT_PATTERN,
		description: `${rate.percent}${percentRanges(rest)}`,
	}
}

/**
 * The root of the decimal form's schema: its units sentence says which numbers are decimal strings,
 * and its examples are converted with the same rule.
 */
export function decimalRoot(): Node {
	const root: Node = { ...PUBLISHED }
	delete root["$schema"]
	if (typeof root["description"] === "string") {
		root["description"] = root["description"].replace(MINOR_UNITS_SENTENCE, DECIMAL_UNITS_SENTENCE)
	}
	const examples = Array.isArray(root["examples"]) ? root["examples"] : undefined
	const converted = examples?.flatMap((example) => {
		const decimal = isNode(example) ? toDecimalForm(example) : undefined
		return decimal === undefined || isAppError(decimal) ? [] : [decimal]
	})
	const shaped = decimalNode(root) as Node
	return converted === undefined ? shaped : { ...shaped, examples: converted }
}

/**
 * The `scenario apply --decimal` form's input schema. It accepts any JSON value, like the minor
 * form, because the conversion (and every refusal of it) runs after the document is read, so its
 * failures can name a currency or an amount's places, which a schema check cannot. It is published
 * by `traj schema` as the document's alternate form.
 */
export const decimalDocument: z.ZodType<unknown> = z.unknown().meta(decimalRoot())
