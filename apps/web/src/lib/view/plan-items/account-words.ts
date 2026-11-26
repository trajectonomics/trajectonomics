/** The words of what an Account pays out, from the payout as the document stores it. Text only: no figure is computed. */
import type { ScenarioAccount } from "../../contract/scenario-show"
import { formatDate } from "../../format/date"
import { percentWords } from "../../format/percent"
import { type ItemNames, itemLabel, NO_ITEM_NAMES } from "../item-names"
import { type Part, type Words, wordsOf } from "../words"
import { PAYOUT_LABELS } from "./account-income"

const FREQUENCY_WORDS: Readonly<Record<string, string>> = {
	monthly: "monthly",
	quarterly: "quarterly",
	semiannual: "twice a year",
	annual: "yearly",
}

/** The words of a payout from its stored text: the share, and where it starts when it does not start now. */
export function payoutWords(
	account: ScenarioAccount,
	names: ItemNames = NO_ITEM_NAMES,
): Words | null {
	const payout = account.payout
	if (payout === undefined) return null
	let from: readonly Part[] = []
	if (payout.startAt !== undefined) {
		from = [" from ", { item: itemLabel(names, "milestone", payout.startAt) }]
	} else if (payout.start !== undefined) {
		from = [` from ${formatDate(payout.start)}`]
	}
	return wordsOf([`Pays out ${percentWords(payout.bps)}% a year`, ...from])
}

/** How a payout is paid, and the kind of income the tax label says it is when it says one the form writes. */
export function payoutHowWords(account: ScenarioAccount): string | null {
	const payout = account.payout
	if (payout === undefined) return null
	const kind = Object.keys(PAYOUT_LABELS).find((one) => PAYOUT_LABELS[one] === payout.label)
	const counted =
		kind === undefined ? "" : `, counted as ${kind === "other" ? "other income" : kind}`
	return `Paid ${FREQUENCY_WORDS[payout.frequency] ?? payout.frequency}${counted}`
}
