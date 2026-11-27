import { formatMoney, MINUS } from "./money"

const DECIMAL = /^(-?)(\d+)(\.\d+)?$/

/** The digit counts where the unit changes: thousands below 7, millions below 10, then billions. */
const MILLIONS = 7
const BILLIONS = 10

/** The unit a whole number of this many digits takes, and how many of its digits stay before the point. */
function unitOf(digits: number): { suffix: string; lead: number } {
	if (digits >= BILLIONS) return { suffix: "B", lead: digits - 9 }
	if (digits >= MILLIONS) return { suffix: "M", lead: digits - 6 }
	return { suffix: "k", lead: digits - 3 }
}

/**
 * A card's short form of a CLI money string, by string operations only: "1214900.00" becomes
 * "1.21M", "184000.00" becomes "184k" and "1234567890123.00" becomes "1,234B". The leading digits
 * are kept and the rest dropped, truncating toward zero, so a card never states more than the CLI
 * did: "999999.99" is "999k", never "1M" (web ADR 0002). An amount of three digits or fewer stays
 * exact, and a string that is not a decimal is returned as it came.
 */
export function formatCompact(amount: string): string {
	const match = DECIMAL.exec(amount)
	if (!match) return amount
	const [, sign = "", whole = ""] = match
	const digits = whole.replace(/^0+(?=\d)/, "")
	if (digits.length <= 3) return formatMoney(amount)
	const { suffix, lead } = unitOf(digits.length)
	const integer = digits.slice(0, lead).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
	const places = 3 - lead
	const end = places > 0 ? lead + places : lead
	const fraction = digits.slice(lead, end).replace(/0+$/, "")
	const point = fraction === "" ? "" : `.${fraction}`
	return `${sign === "-" ? MINUS : ""}${integer}${point}${suffix}`
}
