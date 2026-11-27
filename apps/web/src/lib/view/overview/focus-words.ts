import type { ProjectionChance } from "../../contract"
import { formatCompact, formatMoney, formatMonth, MINUS, maskMoney, yearOf } from "../../format"

/** The answer written on the chart when there is no plan, or no FI read, to answer from. */
export const SETUP_ANSWER = "Set up your plan"

/** The one sentence the focus point's heading says when the plan is not set up. */
export const SETUP_SENTENCE =
	"Where do you stand? Add your income, spending and savings, and traj answers when you could stop working."

/** "Your money runs out in Feb 2053, at 62." The age is the holder's, and only when the year row states it. */
export function runsOutSentence(date: string, holderAge: number | null): string {
	const age = holderAge === null ? "" : `, at ${holderAge}`
	return `Your money runs out in ${formatMonth(date)}${age}.`
}

/** The exact shortfall, or the note that it is hidden; the chart's label is the compact form. */
export function shortfallSentence(unmet: string, currency: string, hidden: boolean): string {
	if (hidden) return "The amount short by the end of the plan is hidden."
	return `${formatMoney(unmet)} ${currency} short by the end of the plan.`
}

/** The bar's label: the compact shortfall under zero, masked when amounts are hidden. */
export function shortfallLabel(unmet: string, hidden: boolean): string {
	if (hidden) return maskMoney(unmet)
	const shown = formatCompact(unmet)
	return shown.startsWith(MINUS) ? shown : `${MINUS}${shown}`
}

/** "Your money lasts to 2053 in 193 of 200 markets tested.", or nothing when the chance read is missing. */
export function chanceSentence(chance: ProjectionChance | null): string {
	if (chance === null) return ""
	const markets = chance.paths === 1 ? "market" : "markets"
	return `Your money lasts to ${yearOf(chance.horizon)} in ${chance.succeeded} of ${chance.paths} ${markets} tested.`
}
