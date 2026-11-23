import { DATE, RULE_RATE_UNITS, YEARLY_UNITS } from "./terms"

/*
 * The parts of a Spending rule's shape (cli ADR-0063): a rate field, a bound, a guardrail band and a
 * rate step. They live here so `rule-shape.ts` states the rule itself in one screen.
 */

/** A rate field of a rule: the unit sentence, then what this rate is. */
export function rate(what: string): Record<string, unknown> {
	return { type: "integer", description: `${RULE_RATE_UNITS} ${what}` }
}

/** The lowest or highest amount a `currentRate` year may pay, grown from the Flow's `start`. */
export function boundShape(which: "lowest" | "highest"): Record<string, unknown> {
	return {
		type: "object",
		description: `\`currentRate\` only: the ${which} amount a Rule year may pay. It grows from the Flow's \`start\` by the whole years at the year's first occurrence, as a fixed amount does, so a Flow a Milestone gates meets a bound that has already grown by the years before it lands. A floor above a ceiling is refused; growth that later makes them cross is accepted, and the ceiling wins.`,
		properties: {
			amount: {
				type: "integer",
				description: `${YEARLY_UNITS} The ${which} amount of one Rule year.`,
			},
			growth: {
				anyOf: [
					{ const: "inflation", description: "Follow `economy.inflation`." },
					{
						type: "object",
						properties: {
							bps: {
								type: "integer",
								description:
									"Integer basis points (1 bps = 0.01%), so 3% is 300. Per year; negative steps it down.",
							},
						},
						required: ["bps"],
						additionalProperties: false,
					},
				],
				description:
					'The yearly step applied to the bound from the Flow\'s `start`: `"inflation"`, or `{ "bps": 0 }` for a bound that never moves. Required.',
			},
		},
		required: ["amount", "growth"],
		additionalProperties: false,
	}
}

/** A guardrails band: the share the withdrawal rate may drift by, and how far the amount moves past it. */
export function bandShape(which: "upper" | "lower"): Record<string, unknown> {
	const past = which === "upper" ? "above" : "below"
	const move = which === "upper" ? "cut" : "raised"
	return {
		type: "object",
		description: `\`guardrails\` only: the ${which} guardrail. When last year's amount, grown one year by inflation, is ${past} the band around the rule's rate, the year's amount is ${move}. At least one of \`upper\` and \`lower\` is required: \`lower\` alone is a ratchet that never cuts.`,
		properties: {
			bps: rate(
				`How far the withdrawal rate may drift ${past} \`rateBps\`, as a share of it: 2000 is 20% of the rate. 0 to 10000.`,
			),
			adjustBps: rate(
				`How far the amount moves when the rate leaves the band: 1000 ${which === "upper" ? "cuts it by" : "raises it by"} 10%. 0 to 10000.`,
			),
		},
		required: ["bps", "adjustBps"],
		additionalProperties: false,
	}
}

/** One step of a `currentRate` rule's rate, from a date on. */
export const stepShape: Record<string, unknown> = {
	type: "object",
	properties: {
		from: { type: "string", description: `The first date the step applies from, as ${DATE}` },
		bps: rate(
			"The rate from `from` on, replacing `rateBps`. 1 to 10000. A year uses the last step whose `from` is on or before the year's first date.",
		),
	},
	required: ["from", "bps"],
	additionalProperties: false,
}
