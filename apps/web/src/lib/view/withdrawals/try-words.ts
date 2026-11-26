/**
 * The session bar's words for a Flow the person tried: the rule kind and share, and the Accounts by name. A figure
 * (an amount, a floor) is never in them, so hiding amounts has nothing to mask. Pure.
 */
import type { Json } from "../../what-if/json"
import { spendingRule, WITHDRAWAL_ID } from "./rule"
import { ruleWords } from "./words"

/** The Flow's id in a Set's path (`flows.rent.rule` names `rent`). The CLI names no Flow, so the id is shown as it is. */
function nameOf(path: string): string {
	return path.split(".")[1] ?? path
}

/** A Json value as a record, or null. */
function recordOf(value: Json): Record<string, Json> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null
}

/**
 * What a tried Flow, or a tried rule, says in words; `fallback` (the session's own label) when it is neither a
 * spending rule nor the withdrawals page's level amount. `account` names an Account id the way the person knows it.
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
	// Only the withdrawals page's own spending Flow reads this way: elsewhere a whole-Flow Set is just a try.
	if (
		nameOf(change.path) === WITHDRAWAL_ID &&
		flow !== null &&
		flow["rule"] === undefined &&
		flow["growth"] === "inflation"
	) {
		return `${nameOf(change.path)}: a level amount that keeps pace with inflation`
	}
	return change.label
}
