const CURRENCY_SYMBOLS = /[฿$€£¥₹]/g
/** Digits grouped by commas in threes, with an optional sign and decimals: the only commas read as thousands separators. */
const GROUPED = /^([-+]?)(\d{1,3}(?:,\d{3})+)(\.\d+)?$/

/** The longest amount text one value may carry; `traj` reads a plain decimal, which is far shorter. */
export { RECORD_VALUE_MAX_LENGTH as AMOUNT_MAX_LENGTH } from "../../edit/record-values"

/**
 * An amount as typed, with a currency symbol and thousands separators taken off, and nothing else changed.
 * A string that is not a plain decimal after that (a comma decimal, a bracketed negative, a word) is kept as it
 * was typed, so `traj` refuses it and the row is shown. The page parses no amount and does no arithmetic.
 */
export function typedAmount(cell: string): string {
	const text = cell.replace(CURRENCY_SYMBOLS, "").trim()
	const grouped = GROUPED.exec(text)
	return grouped
		? `${grouped[1]}${(grouped[2] ?? "").replaceAll(",", "")}${grouped[3] ?? ""}`
		: text
}
