import { lineShape } from "./estate-line"

/*
 * The estate block (sim ADR 0025, cli ADR-0064): the costs of settling what a plan leaves and the
 * gifts made from it. Every cost and gift is the caller's own and `traj` ships none; the block is
 * inert, so no other figure of a Projection changes with it.
 */

/** The Scenario's optional `estate` block. */
export const estateShape: Record<string, unknown> = {
	type: "object",
	description:
		"Optional: what the plan would leave. `projection run --estate` states, on every roll-up's end, the gross estate (every asset Account, locked and illiquid ones included), the debts, each cost, each gift and what heirs receive, nominal and in today's money. Debts and costs come first, then gifts, taken only from a positive net. The block changes no other figure of a Projection. Every cost and gift is the caller's own and `traj` ships none: a person types each share. Thai inheritance tax is not modelled: an inheritance tax, a transfer fee, a sale tax or a stamp duty is a cost line the caller states. Omit the block and `--estate` still states the gross estate less the debts.",
	properties: {
		costs: {
			type: "array",
			description:
				"What settling the estate costs, such as court and lawyer fees or the cost of selling a home, in the order stated.",
			items: lineShape("cost"),
		},
		gifts: {
			type: "array",
			description:
				"What is given from the net estate, to a temple, a charity or a named person, in the order stated: a later gift takes only what earlier ones left.",
			items: lineShape("gift"),
		},
	},
	additionalProperties: false,
}
