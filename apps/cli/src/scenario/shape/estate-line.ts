import {
	ESTATE_COST_BASES,
	ESTATE_GIFT_BASES,
	ESTATE_RATE_UNITS,
	ESTATE_UNITS,
} from "./estate-terms"
import { BASIS_POINTS, ROUNDINGS } from "./terms"

/*
 * One cost or gift line of the estate block (sim ADR 0025, cli ADR-0064): a flat object, as a Flow
 * is, with the keys of its two forms said in the descriptions and refused by the core's own
 * `check()`: a share states `of`, `bps` and `rounding`, a fixed amount states `amount` and `growth`.
 */

const SHARE_OF_COST =
	'A cost\'s base: `"gross"` (the gross estate) or `{ "accounts": ["id", ...] }` (the summed value of those asset Accounts, a sum below 0 counting 0). A liability is refused as ESTATE_ACCOUNT_LIABILITY.'
const SHARE_OF_GIFT =
	'A gift\'s base: `"net"`, the net estate, which is what is left after debts and costs. A gift is taken only from a positive net, and never more than what earlier gifts left.'

/** The `of` of a share line: the cost's base is a closed word or a list of Accounts, a gift's one word. */
function ofShape(kind: "cost" | "gift"): Record<string, unknown> {
	if (kind === "gift") {
		return {
			const: ESTATE_GIFT_BASES[0],
			description: `Share only. ${SHARE_OF_GIFT}`,
		}
	}
	return {
		anyOf: [
			{ const: ESTATE_COST_BASES[0], description: "The gross estate." },
			{
				type: "object",
				properties: {
					accounts: {
						type: "array",
						items: { type: "string" },
						description:
							"One or more distinct asset Accounts, as the Scenario spells their ids, summed on the date.",
					},
				},
				required: ["accounts"],
				additionalProperties: false,
			},
		],
		description: `Share only. ${SHARE_OF_COST}`,
	}
}

/** One cost or gift line: a share (`of`, `bps`, `rounding`) or a fixed amount (`amount`, `growth`). */
export function lineShape(kind: "cost" | "gift"): Record<string, unknown> {
	return {
		type: "object",
		description: `One ${kind}, in the document's order. It is a share of a base (\`of\`, \`bps\`, \`rounding\`) or a fixed \`amount\` that grows by \`growth\` from the plan's start (\`amount\`, \`growth\`), never both. Its \`id\` is unique across the costs and gifts together.`,
		properties: {
			id: {
				type: "string",
				description: "The name this document gives the line, unique within the block.",
			},
			of: ofShape(kind),
			bps: {
				type: "integer",
				description: `${ESTATE_RATE_UNITS} Share only: the share of the base, 0 to 10000.`,
			},
			rounding: {
				enum: [...ROUNDINGS],
				description:
					"Share only, and required there: how the share rounds once, `floor` down, `halfUp` to the nearest with a half rounding up, `ceil` up. No default.",
			},
			amount: {
				type: "integer",
				description: `${ESTATE_UNITS} Fixed amount only: the same figure whatever the estate is worth.`,
			},
			growth: {
				anyOf: [
					{ const: "inflation", description: "Follow `economy.inflation`." },
					{
						type: "object",
						properties: {
							bps: {
								type: "integer",
								description: `${BASIS_POINTS} Per year; negative steps it down.`,
							},
						},
						required: ["bps"],
						additionalProperties: false,
					},
				],
				description:
					'Fixed amount only, and required there: the yearly step applied to `amount` from the plan\'s start, in whole years: `"inflation"`, or `{ "bps": 0 }` for none.',
			},
		},
		required: ["id"],
		additionalProperties: false,
	}
}
