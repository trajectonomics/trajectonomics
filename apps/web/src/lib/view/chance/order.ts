const DECIMAL = /^(-?)(\d+)(?:\.(\d+))?$/

/** A money string read as its parts: whether it is below zero, its whole digits without leading zeros, and its fraction. */
interface Digits {
	readonly negative: boolean
	readonly whole: string
	readonly fraction: string
}

/** A decimal string's digits, read as text. "-0.00" is zero, so it is not negative. Null when it is not a decimal. */
function digitsOf(amount: string): Digits | null {
	const match = DECIMAL.exec(amount)
	if (match === null) return null
	const [, sign = "", whole = "", fraction = ""] = match
	const stripped = whole.replace(/^0+(?=\d)/, "")
	const zero = /^0*$/.test(stripped) && /^0*$/.test(fraction)
	return { negative: sign === "-" && !zero, whole: stripped, fraction }
}

/** Which of two digit strings of non-negative numbers is larger: the longer whole part, then digit by digit. */
function compareMagnitude(a: Digits, b: Digits): -1 | 0 | 1 {
	if (a.whole.length !== b.whole.length) return a.whole.length < b.whole.length ? -1 : 1
	if (a.whole !== b.whole) return a.whole < b.whole ? -1 : 1
	const width = Math.max(a.fraction.length, b.fraction.length)
	const left = a.fraction.padEnd(width, "0")
	const right = b.fraction.padEnd(width, "0")
	if (left === right) return 0
	return left < right ? -1 : 1
}

/** The order of two strings that may not be decimals: one that is not sorts last, and two that are not are equal. */
function compareInvalid(left: Digits | null, right: Digits | null): -1 | 0 | 1 {
	if (left === null) return right === null ? 0 : 1
	return -1
}

/**
 * Orders two money strings by what they state, as text and never as numbers ([ADR 0002](../../../../docs/adr/0002-the-cli-is-the-only-source-of-figures.md)):
 * a negative is below a non-negative; two of one sign are told apart by the length of their whole digits, then the
 * digits, then the fraction. The CLI states no order of its own for the paths in JSON (cli ADR 0069: path order), so the
 * Dashboard orders the figures it was given and does no arithmetic on them. A string that is not a decimal sorts last.
 */
export function compareMoney(a: string, b: string): -1 | 0 | 1 {
	const left = digitsOf(a)
	const right = digitsOf(b)
	if (left === null || right === null) return compareInvalid(left, right)
	if (left.negative !== right.negative) return left.negative ? -1 : 1
	const magnitude = compareMagnitude(left, right)
	if (!left.negative || magnitude === 0) return magnitude
	return magnitude === 1 ? -1 : 1
}
