/** The words of the Withdrawals page: what a rule does, what it did in a year, and what each level means. */
import type { ScenarioFlow } from "../../contract/scenario-show"
import { ruleOf, type SpendingRule } from "./rule"

/** The how-to-spend choices the form offers, with the words the person reads. */
export const HOW_CHOICES = [
	{ value: "", label: "Choose how you spend" },
	{ value: "level", label: "A level amount that keeps pace with inflation" },
	{ value: "initialRate", label: "A share at the start, then level" },
	{ value: "currentRate", label: "A share of what your savings are worth each year" },
	{ value: "guardrails", label: "A share with limits that cut and raise" },
] as const

/** What the rule did to a Rule year's amount, in words. */
export const ACTION_WORDS: Readonly<Record<string, string>> = {
	none: "Followed the rule",
	floor: "Held up to your lowest amount",
	ceiling: "Held down to your highest amount",
	cut: "Cut: the share had grown too large",
	raise: "Raised: the share had grown too small",
}

/** A Percentile level in plain words, for the lowest year's spread across Market paths. */
export function levelWords(level: number): string {
	if (level === 10) return "Worst 1 in 10 paths"
	if (level === 25) return "Worst 1 in 4 paths"
	if (level === 50) return "Middle path"
	if (level === 75) return "Best 1 in 4 paths"
	if (level === 90) return "Best 1 in 10 paths"
	return `The ${level}th Percentile`
}

/**
 * One rule in a sentence with no amount in it: the kind and the starting share (a rate is not money). A Flow
 * with no rule the page reads says nothing, so the Expenses page shows it as it always did.
 */
export function ruleSummary(flow: ScenarioFlow): string | null {
	const rule = ruleOf(flow)
	return rule === null ? null : ruleSentence(rule)
}

/** A rule's kind and starting share in a sentence, with no amount in it. */
export function ruleSentence(rule: SpendingRule): string {
	const share = `${rule.rateBps}%`
	if (rule.kind === "initialRate")
		return `Spends ${share} of savings at the start, then level with inflation`
	if (rule.kind === "currentRate") {
		const limits = rule.floor || rule.ceiling ? ", with limits" : ""
		return `Spends ${share} of what savings are worth each year${limits}`
	}
	return `Spends ${share} of savings at the start, then cuts and raises by guardrails`
}

/** A rule with the Accounts it reads by name: "Spends 4% of savings at the start, then level, from Cash and Fund". */
export function ruleWords(rule: SpendingRule, nameOf: (id: string) => string): string {
	const names = rule.portfolio.map(nameOf)
	const last = names.pop()
	const from = names.length === 0 ? (last ?? "") : `${names.join(", ")} and ${last}`
	return from === "" ? ruleSentence(rule) : `${ruleSentence(rule)}, from ${from}`
}
