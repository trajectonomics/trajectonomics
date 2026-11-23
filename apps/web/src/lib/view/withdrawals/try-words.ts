/**
 * The session bar's words for a Flow the person tried: the rule kind and share, and the Accounts by name. A figure
 * (an amount, a floor) is never in them, so hiding amounts has nothing to mask. Pure.
 */
import type { Json } from "../../what-if/json"
import { spendingRule } from "./rule"
import { ruleWords } from "./words"

/** The Flow's id in a Set's path (`flows.rent.rule` names `rent`), with its first letter in capitals. */
function nameOf(path: string): string {
	const id = path.split(".")[1] ?? path
	return id.charAt(0).toUpperCase() + id.slice(1)
}

/** A Json value as a record, or null. */
function recordOf(value: Json): Record<string, Json> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null
}

/**
 * What a tried Flow, or a tried rule, says in words; `fallback` (the session's own label) when it is neither a
 * spending rule nor a level amount. `account` names an Account id the way the person knows it.
 */
export function tryWords(
	change: { path: string; value: Json; label: string },
	account: (id: string) => string,
): string {
	const flow = change.path.endsWith(".rule") ? null : recordOf(change.value)
	const rule = spendingRule.safeParse(flow === null ? change.value : flow["rule"])
	if (rule.success) {
		const sentence = ruleWords(rule.data, account)
		return `${nameOf(change.path)}: ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`
	}
	if (flow !== null && flow["rule"] === undefined && flow["growth"] === "inflation") {
		return `${nameOf(change.path)}: a level amount that keeps pace with inflation`
	}
	return change.label
}
