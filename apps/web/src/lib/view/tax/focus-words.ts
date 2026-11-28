import { formatCompact } from "../../format"
import { dropLeadingMinus } from "../../format/direction"
import { isRefund } from "./tax-rows"

/** The year's own answer in words: its tax, or a refund, and the date it settles. */
export function answerWords(
	period: string,
	owed: string,
	settles: string,
	currency: string,
): string {
	const amount = formatCompact(dropLeadingMinus(owed))
	if (isRefund(owed)) {
		return `How much tax for ${period}? A refund of ${amount} ${currency}, due ${settles}.`
	}
	return `How much tax for ${period}? ${amount} ${currency} due ${settles}.`
}

/** The year's figure, or the note that Hide amounts hides it; the date stays either way. */
export function headWords(
	period: string,
	owed: string,
	settles: string,
	currency: string,
	hidden: boolean,
): string {
	if (hidden) return `How much tax for ${period}? The amount is hidden. Due ${settles}.`
	return answerWords(period, owed, settles, currency)
}

/** "You could still save 91.7k THB." or the note that the saving is hidden too. */
export function savingWords(saving: string, currency: string, hidden: boolean): string {
	if (hidden) return " You could still save an amount that is hidden."
	return ` You could still save ${formatCompact(saving)} ${currency}.`
}
