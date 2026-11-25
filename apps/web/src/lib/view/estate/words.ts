/**
 * The plan's estate lines in words: the share and what it is of, or the fixed amount and how it grows, as the document
 * holds them. Text only: a share is shown as the document states it, never worked out (web ADR 0002).
 */
import type { EstateLine } from "../../contract"
import { formatBps } from "../../format/bps"

const ROUNDING_WORDS: Readonly<Record<string, string>> = {
	floor: "rounded down",
	halfUp: "rounded to the nearest, a half up",
	ceil: "rounded up",
}

/** What a share is of: everything owned, the net estate, or the Accounts by the names the person knows. */
function ofWords(line: EstateLine, account: (id: string) => string): string {
	const of = line.of
	if (of === "gross") return "everything owned"
	if (of === "net") return "what is left after debts and costs"
	if (typeof of === "object") return of.accounts.map(account).join(", ")
	return "an unchosen base"
}

/** One line in a sentence: the words, and a fixed line's amount apart, so the page can show it as money and hide it when asked. */
export interface LineWords {
	/** The CLI's decimal text of a fixed amount, or null for a share. It leads the sentence when present. */
	readonly amount: string | null
	readonly words: string
}

/** One line in a sentence: "1.00% of everything owned, rounded to the nearest, a half up". */
export function lineWords(line: EstateLine, account: (id: string) => string): LineWords {
	if (line.bps !== undefined) {
		const rounding =
			line.rounding === undefined ? "" : `, ${ROUNDING_WORDS[line.rounding] ?? line.rounding}`
		return { amount: null, words: `${line.bps}% of ${ofWords(line, account)}${rounding}` }
	}
	if (line.amount !== undefined) {
		const growth = line.growth
		const grows =
			growth === undefined || growth === "inflation"
				? "keeping pace with inflation"
				: `growing ${formatBps(growth.bps)}% a year`
		return { amount: line.amount, words: `in the money of the plan's start, ${grows}` }
	}
	return { amount: null, words: "not set" }
}
