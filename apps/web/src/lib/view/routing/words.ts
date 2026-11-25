/**
 * The sentence of each routing row, as parts: text, and the document's own amounts, which the page draws with `Money` so the
 * hide-amounts switch masks them. An amount is the document's decimal string as typed or stored, never computed (ADR 0002).
 */
import { formatBps, percentWords } from "../../format"
import { type AccountNames, nameOf } from "../account-names"
import { amountOf, type Entry, entryAccount, isReal, type Step, type Target } from "./entries"

/** A piece of a sentence: words, or a money amount the page formats and masks. */
export type Part = string | { readonly amount: string }

/** A sentence's text with each amount grouped, for a label a screen reader or a test reads. */
export function plainText(parts: readonly Part[], money: (amount: string) => string): string {
	return parts.map((part) => (typeof part === "string" ? part : money(part.amount))).join("")
}

/** " in today's money" for a target that keeps its value, else nothing. */
function realWords(target: Target | undefined): string {
	if (isReal(target)) return " in today's money"
	const growth = typeof target === "object" ? target.growth : undefined
	return typeof growth === "object" ? `, growing ${formatBps(growth.bps)}% a year` : ""
}

/** The surplus step at `index` of `count` in a sentence: "Fill Emergency fund up to 300,000 in today's money". */
export function stepWords(step: Step, index: number, count: number, names: AccountNames): Part[] {
	const name = nameOf(names, step.account)
	const cap: Part[] =
		step.upTo === undefined
			? []
			: [" up to ", { amount: amountOf(step.upTo) }, realWords(step.upTo)]
	if (step.share !== undefined) {
		return [`Put ${percentWords(step.share)}% of what is left into ${name}`, ...cap]
	}
	if (step.upTo !== undefined) return [`Fill ${name}`, ...cap]
	return [
		index > 0 && index === count - 1 ? `Everything else into ${name}` : `Everything into ${name}`,
	]
}

/** The `withdraw` entry at `index` in a sentence: "Take from Funds", "Take from Savings, down to ...", "Then the rest of Savings". */
export function entryWords(list: readonly Entry[], index: number, names: AccountNames): Part[] {
	const entry = list[index]
	if (entry === undefined) return []
	const name = nameOf(names, entryAccount(entry))
	if (typeof entry === "object") {
		return [
			`Take from ${name}, down to `,
			{ amount: amountOf(entry.downTo) },
			realWords(entry.downTo),
		]
	}
	const earlier = list.slice(0, index).some((one) => entryAccount(one) === entry)
	return [earlier ? `Then the rest of ${name}` : `Take from ${name}`]
}
