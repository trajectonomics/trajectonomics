import { bandShape, boundShape, rate, stepShape } from "./rule-parts"
import { ROUNDINGS, RULE_KINDS } from "./terms"

/*
 * A Spending rule (sim ADR 0023, cli ADR-0063): the fourth form of an expense Flow's amount, whose
 * yearly figure follows what a portfolio is worth. It is one flat object so the decimal form's walk
 * (cli ADR-0047) reaches every rate and amount by `properties`; the keys each kind takes are said in
 * the descriptions and refused by the core's own `check()`. Every rate in it is the caller's: `traj`
 * ships none, and no example in this file is a recommendation.
 */

/** The `rule` of an expense Flow, in place of `amount`, `derive` and `level`. */
export const ruleShape: Record<string, unknown> = {
	type: "object",
	description:
		"Expense only, in place of `amount`, `derive` and `level` (and with no `growth`): a Spending rule that fixes one amount a Rule year from what the `portfolio` is worth on the year's first date. A Rule year is twelve monthly occurrences, or one annual one, counted from the Flow's first landed date, and is paid in equal parts. `initialRate` fixes the first year's amount as a share of the portfolio and grows it by `economy.inflation` each later year; `currentRate` takes a share of what the portfolio is worth each year, with optional `steps`, `floor` and `ceiling`; `guardrails` starts as `initialRate`, then cuts after the share has grown too large and raises it after it has grown too small. Every rate, step, band and bound is the caller's own: `traj` ships none and the example states its own. Only a `monthly` or `annual` Flow takes a rule (any other frequency is refused as `RULE_FREQUENCY`), and a liability or illiquid asset in the portfolio is refused.",
	properties: {
		kind: {
			enum: [...RULE_KINDS],
			description:
				"`initialRate`, `currentRate` or `guardrails`: which of the three rules the Flow follows.",
		},
		portfolio: {
			type: "array",
			items: { type: "string" },
			description:
				"One or more distinct asset Accounts, as the Scenario spells their ids, summed on each Rule year's first date. Not a liability and not an Account marked `liquid: false`. An Account locked until a date is read at its full value, so the `cashflow.withdraw` list, not the portfolio, decides what can pay.",
		},
		rateBps: rate(
			"The share of the portfolio the rule starts from, 1 to 10000: a 4% rate takes 4% of what the portfolio is worth.",
		),
		rounding: {
			enum: [...ROUNDINGS],
			description:
				"How each division by 10000 rounds: `floor` down, `halfUp` to the nearest with a half rounding up, `ceil` up. Required, with no default.",
		},
		steps: {
			type: "array",
			items: stepShape,
			description:
				"`currentRate` only: rates by date, a non-empty list in ascending `from` order, so a share can rise with age.",
		},
		floor: boundShape("lowest"),
		ceiling: boundShape("highest"),
		upper: bandShape("upper"),
		lower: bandShape("lower"),
	},
	required: ["kind", "portfolio", "rateBps", "rounding"],
	additionalProperties: false,
}

/** The rule as a Flow's `rule` key states it: its own description, then which Flows must state it. */
export const flowRuleShape: Record<string, unknown> = {
	...ruleShape,
	description: `${ruleShape["description"]} Required unless the Flow states \`amount\`, \`derive\` or \`level\`.`,
}
