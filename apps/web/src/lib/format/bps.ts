/**
 * Rates as the person reads and types them: a percent with at most two places, moved to and from the
 * integer basis points the document holds (1 bps = 0.01%). Text only: a rate is moved by its decimal
 * point, never converted by a float, and a rate is not money (web ADR 0002).
 */

/** A rate's text in the document's integer: an optional sign, digits, and at most two places. */
const PERCENT_TEXT = /^(-?)(\d+)(?:\.(\d{1,2}))?$/
/** A basis-point integer as the document prints it: an optional sign and digits. */
const BPS_TEXT = /^-?\d+$/
/** Digits beyond this many could pass the safe integer range, so such a rate is refused. */
const MAX_DIGITS = 15

/** A basis-point integer as a percent with two places, such as 300 as "3.00" and -50 as "-0.50". */
export function formatBps(bps: number): string {
	const text = String(bps)
	if (!BPS_TEXT.test(text)) throw new RangeError(`not an integer of basis points: ${text}`)
	const negative = text.startsWith("-")
	const digits = (negative ? text.slice(1) : text).padStart(3, "0")
	return `${negative ? "-" : ""}${digits.slice(0, -2)}.${digits.slice(-2)}`
}

/**
 * The integer of basis points a percent names, such as "3" or "3.50" as 300 and 350, or null when the
 * text is not a percent with at most two places (such as "3.005"). The digits are read one at a time,
 * so no float is ever made from them.
 */
export function parseBps(text: string): number | null {
	const match = PERCENT_TEXT.exec(text.trim())
	if (match === null) return null
	const [, sign = "", whole = "", fraction = ""] = match
	const digits = `${whole}${fraction.padEnd(2, "0")}`.replace(/^0+(?=\d)/, "")
	if (digits.length > MAX_DIGITS) return null
	let bps = 0
	for (const digit of digits) bps = bps * 10 + (digit.charCodeAt(0) - 48)
	if (bps === 0) return 0
	return sign === "-" ? -bps : bps
}
