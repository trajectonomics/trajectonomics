/** The groups of the pre-filled rates: inflation, what Accounts grow at and what debts charge. Pure. */
import { formatBps } from "../../format/bps"
import { percentWords } from "../../format/percent"
import { splitPath } from "../document-path"
import { change, keepOf, type Prefilled } from "./prefilled"
import type { AssumedGroup, AssumedSubject } from "./types"

/** One pre-filled rate: its item, its Account and the percent as a sentence reads it. */
export interface Rate {
	readonly item: Prefilled
	readonly subject: AssumedSubject
	readonly percent: string
}

const percentOf = (bps: number): string => percentWords(formatBps(bps))

export function inflation(items: readonly Prefilled[], search: string): AssumedGroup[] {
	return items.flatMap((item) => {
		if (item.path !== "economy.inflation" || typeof item.value !== "number") return []
		const percent = percentOf(item.value)
		const line = { key: item.path, text: `Inflation: ${percent}% a year`, keep: keepOf(item) }
		return [
			{
				key: "inflation" as const,
				sentence: { subject: null, text: `Inflation is ${percent}% a year` },
				lines: [line],
				link: change("/settings/assumptions/", search),
			},
		]
	})
}

/** The pre-filled rates of the Accounts, in the CLI's order. */
export function ratesOf(items: readonly Prefilled[]): Rate[] {
	return items.flatMap((item) => {
		const [section, id, field] = splitPath(item.path)
		if (section !== "accounts" || id === undefined || field !== "rate") return []
		if (typeof item.value !== "number") return []
		return [{ item, subject: { kind: "account" as const, id }, percent: percentOf(item.value) }]
	})
}

/** The words of one side's rates: what one Account does, what several do alike, and when they differ. */
const WORDS = {
	"account-rates": {
		one: (percent: string) => `grows at ${percent}% a year`,
		same: (n: number, percent: string) => `${n} accounts grow at ${percent}% a year`,
		differ: (n: number) => `${n} accounts grow at rates you did not set`,
		line: (percent: string) => `${percent}% a year`,
		href: "/settings/assumptions/",
	},
	"debt-rates": {
		one: (percent: string) => `charges ${percent}% interest`,
		same: (n: number, percent: string) => `${n} debts charge ${percent}% interest`,
		differ: (n: number) => `${n} debts charge rates you did not set`,
		line: (percent: string) => `${percent}% interest`,
		href: "/assets-and-debts/",
	},
}

export function rateGroup(
	key: keyof typeof WORDS,
	rates: readonly Rate[],
	search: string,
): AssumedGroup[] {
	const [first] = rates
	if (first === undefined) return []
	const words = WORDS[key]
	const alike = rates.every((rate) => rate.percent === first.percent)
	const sentence =
		rates.length === 1
			? { subject: first.subject, text: words.one(first.percent) }
			: {
					subject: null,
					text: alike ? words.same(rates.length, first.percent) : words.differ(rates.length),
				}
	const lines = rates.map(({ item, subject, percent }) => ({
		key: item.path,
		subject,
		text: words.line(percent),
		keep: keepOf(item),
	}))
	return [{ key, sentence, lines, link: change(words.href, search) }]
}
