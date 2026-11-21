/** The true minus sign, U+2212, which the Dashboard prints in place of a hyphen-minus. */
export const MINUS = "−"

const DECIMAL = /^(-?)(\d+)(\.\d+)?$/

/**
 * Groups the digits of a money string by thousands, with string operations only: "-1234567.50"
 * becomes "−1,234,567.50". A string that is not a decimal is returned as it came.
 */
export function formatMoney(amount: string): string {
	const match = DECIMAL.exec(amount)
	if (!match) return amount
	const [, sign = "", whole = "", fraction = ""] = match
	return `${sign === "-" ? MINUS : ""}${groupThousands(whole)}${fraction}`
}

function groupThousands(digits: string): string {
	const groups: string[] = []
	for (let end = digits.length; end > 0; end -= 3) {
		groups.unshift(digits.slice(Math.max(0, end - 3), end))
	}
	return groups.join(",")
}
