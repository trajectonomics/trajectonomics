/**
 * A spending rule as a Flow of the Scenario document holds it (cli ADR 0063), in the decimal form: every rate is
 * a percent string such as "4.00", a bound's amount is in major units, and a bound's growth is the CLI's. Pure:
 * the page reads a rule to show and to edit it and never works a figure out of one (web ADR 0002).
 */
import { z } from "zod"
import type { ScenarioFlow } from "../../contract/scenario-show"

/** The three kinds of rule, in the order the form offers them. */
export const RULE_KINDS = ["initialRate", "currentRate", "guardrails"] as const
export type RuleKind = (typeof RULE_KINDS)[number]

/** How a payment rounds to a minor unit. The CLI has no default, so the form has none. */
export const ROUNDINGS = ["floor", "halfUp", "ceil"] as const

/** A floor or a ceiling: the amount of a whole Rule year, and how it grows from the Flow's start. */
const bound = z.looseObject({
	amount: z.string(),
	growth: z.union([z.literal("inflation"), z.looseObject({ bps: z.number().int() })]),
})

/** A guardrail: how far the share may drift from the rule's rate, and how far the amount moves when it does. */
const guard = z.looseObject({ bps: z.string(), adjustBps: z.string() })

/** The rule as `scenario show --decimal` prints it. A rule that does not parse is shown as an ordinary expense. */
export const spendingRule = z.looseObject({
	kind: z.enum(RULE_KINDS),
	portfolio: z.array(z.string()),
	rateBps: z.string(),
	rounding: z.enum(ROUNDINGS),
	steps: z.array(z.looseObject({ from: z.string(), bps: z.string() })).optional(),
	floor: bound.optional(),
	ceiling: bound.optional(),
	upper: guard.optional(),
	lower: guard.optional(),
})
export type SpendingRule = z.infer<typeof spendingRule>
export type RuleBound = z.infer<typeof bound>

/** The rule of a Flow, or null when it has none or a shape this page does not read. */
export function ruleOf(flow: ScenarioFlow): SpendingRule | null {
	const parsed = spendingRule.safeParse(flow.rule)
	return parsed.success ? parsed.data : null
}

/** The conventional id of the Flow the form writes, recorded beside ADR 0060's ids (web ADR 0013). */
export const WITHDRAWAL_ID = "retirement-spending"

/** Whether a Flow is a plain expense that keeps pace with inflation: the form's "level amount". */
export function isLevelAmount(flow: ScenarioFlow): boolean {
	return (
		flow.kind === "expense" &&
		flow.rule === undefined &&
		flow.amount !== undefined &&
		flow.growth === "inflation" &&
		flow.derive === undefined &&
		flow.level === undefined
	)
}

/** The Flows the page can open in its form: an expense with a rule it reads. */
export function ruleFlows(flows: readonly ScenarioFlow[]): ScenarioFlow[] {
	return flows.filter((flow) => flow.kind === "expense" && ruleOf(flow) !== null)
}

/** The Flow the page's one button opens: the conventional one, else the first expense with a rule it reads. */
export function mainFlow(flows: readonly ScenarioFlow[]): ScenarioFlow | undefined {
	return (
		flows.find((flow) => flow.id === WITHDRAWAL_ID && flow.kind === "expense") ??
		ruleFlows(flows)[0]
	)
}
