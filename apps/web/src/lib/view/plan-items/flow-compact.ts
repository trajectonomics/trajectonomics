import type { ScenarioFlow } from "../../contract/scenario-show"
import { formatMonth } from "../../format"
import { percentWords } from "../../format/percent"
import { ruleOf } from "../withdrawals/rule"
import type { datesOfCard } from "./flow-dates"
import { frequencyWords } from "./frequency"

/**
 * The compact card's one line, from the fields the full card reads: how often it lands, an anchored start, the
 * month it ends and whether it follows inflation, and only the ones the Flow has.
 */
export function compactLineOf(flow: ScenarioFlow, dates: ReturnType<typeof datesOfCard>): string {
	const parts = [frequencyWords(flow.frequency)]
	if (dates.startAnchor !== null)
		parts.push(`from ${formatMonth(flow.start)}, ${dates.startAnchor}`)
	if (flow.end !== undefined) parts.push(`until ${formatMonth(flow.end)}`)
	if (flow.growth === "inflation") parts.push("grows with inflation")
	return parts.join(" · ")
}

/** A spending rule's share in words, which the full card states in its Growth row; null for a Flow with no rule. */
export function ruleShareOf(flow: ScenarioFlow): string | null {
	const rule = ruleOf(flow)
	return rule === null ? null : `${percentWords(rule.rateBps)}% of savings`
}
