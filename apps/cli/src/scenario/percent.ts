import { type AppError, fail } from "../errors"

/*
 * The percent form of a Spending rule's rates in the decimal form (cli ADR-0063): basis points
 * written as a percent string, `400` as `"4.00"`. Both directions are text and integers, never a
 * float, so a rate survives the round trip exactly. A value with more than two places is not a whole
 * number of basis points, so it is refused rather than rounded.
 */

/** A plain percent, as money is plain: an optional minus, no grouping, exponent or leading `+`. */
const PERCENT = /^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?$/

/** The hint a rate in the wrong form carries: the two ways to say the same rate. */
export const PERCENT_HINT =
	'write it as a percent string such as "4.00", with at most two places, or drop --decimal to give basis points'

/** `400` is `"4.00"`, `25` is `"0.25"` and `12345` is `"123.45"`: always two places. */
export function formatPercent(bps: number): string {
	const sign = bps < 0 ? "-" : ""
	const text = String(Math.abs(bps)).padStart(3, "0")
	return `${sign}${text.slice(0, -2)}.${text.slice(-2)}`
}

/** `"4.00"` is `400`, or an `invalid_input` at `path` for text that is not a whole number of basis points. */
export function parsePercent(value: string, path: string): number | AppError {
	const match = PERCENT.exec(value)
	if (match === null) {
		return fail("invalid_input", {
			path,
			message: `${path}: "${value}" is not a plain percent such as 4.00`,
			hint: PERCENT_HINT,
		})
	}
	const [, sign = "", whole = "0", fraction = ""] = match
	if (/[^0]/.test(fraction.slice(2))) {
		return fail("invalid_input", {
			path,
			message: `${path}: "${value}" has more than 2 decimal places, so it is not a whole number of basis points`,
			hint: PERCENT_HINT,
		})
	}
	const magnitude = BigInt(whole + fraction.slice(0, 2).padEnd(2, "0"))
	const bps = Number(sign === "-" ? -magnitude : magnitude)
	if (!Number.isSafeInteger(bps)) {
		return fail("invalid_input", {
			path,
			message: `${path}: "${value}" exceeds the safe integer range`,
			hint: PERCENT_HINT,
		})
	}
	return bps
}
