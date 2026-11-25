import type { AppError } from "../errors"
import { parseMinorUnits } from "../store/money"
import type { FieldKind } from "./money-fields"
import { PERCENT_HINT, parsePercent } from "./percent"

/*
 * How one field of the decimal form is read and refused (cli ADR-0047, ADR-0063): a money field as
 * the Currency's major unit, a Spending rule's rate as a percent string. The walk that finds the
 * fields is `decimal.ts`; this says what each kind means.
 */

/** The one hint a money field in the wrong form carries: the two ways to say the same amount. */
export const MONEY_HINT =
	'Write it as a decimal string such as "350.00", or drop --decimal to give minor units'

/** The hint a field in the wrong form carries: the two ways to say the same figure. */
export function hintOf(kind: FieldKind): string {
	return kind === "percent" ? PERCENT_HINT : MONEY_HINT
}

/** The reason a field of `kind` is refused when it is not a string: a JSON number, or something else. */
export function notDecimal(raw: unknown, kind: FieldKind): string {
	const noun = kind === "percent" ? "a rate" : "a money amount"
	return typeof raw === "number"
		? `${noun} is a JSON number, not a decimal string`
		: `${noun} is not a decimal string`
}

/** The stored integer a decimal string means: minor units for money, basis points for a rule's rate. */
export function parseField(
	kind: FieldKind,
	text: string,
	currency: string,
	path: string,
): number | AppError {
	return kind === "percent" ? parsePercent(text, path) : parseMinorUnits(text, currency, path)
}
