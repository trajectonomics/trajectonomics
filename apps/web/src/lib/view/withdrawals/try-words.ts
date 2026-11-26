/**
 * The session bar's words for a Flow the person tried: the rule kind and share, and the Accounts by name. A figure
 * (an amount, a floor) is never in them, so hiding amounts has nothing to mask. Pure.
 */
import type { Json } from "../../what-if/json"
import { spendingRule, WITHDRAWAL_ID } from "./rule"
import { ruleWords } from "./words"

/** The Flow's id in a Set's path (`flows.rent.rule` names `rent`), which addresses the Flow whoever names it. */
function flowIdOf(path: string): string {
	return path.split(".")[1] ?? path
}

/** A Json value as a record, or null. */
function recordOf(value: Json): Record<string, Json> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null
}

/**
 * What a tried Flow, or a tried rule, says in words; `fallback` (the session's own label) when it is neither a
 * spending rule nor the withdrawals page's level amount. `account` names an Account id the way the person knows it,
 * and `flow` a Flow's, which is the plan's label or the id when it states none.
 */
export function tryWords(
	change: { path: string; value: Json; label: string },
	account: (id: string) => string,
	flow: (id: string) => string = (id) => id,
): string {
	const id = flowIdOf(change.path)
	const whole = change.path.endsWith(".rule") ? null : recordOf(change.value)
	const rule = spendingRule.safeParse(whole === null ? change.value : whole["rule"])
	if (rule.success) {
		const sentence = ruleWords(rule.data, account)
		return `${flow(id)}: ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`
	}
	// Only the withdrawals page's own spending Flow reads this way: elsewhere a whole-Flow Set is just a try.
	if (
		id === WITHDRAWAL_ID &&
		whole !== null &&
		whole["rule"] === undefined &&
		whole["growth"] === "inflation"
	) {
		return `${flow(id)}: a level amount that keeps pace with inflation`
	}
	return change.label
}
