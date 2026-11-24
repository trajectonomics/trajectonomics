import { growthShape } from "./growth-shape"
import { BASIS_POINTS, CONTRIBUTION_CAP, ROUTED_UNITS } from "./terms"

/*
 * Where the Scenario's money goes (sim ADR 0030, cli ADR-0070). A surplus step may take a share of what is
 * left, a withdrawal entry may keep a Reserve floor, and a target is either a nominal figure or an amount
 * that keeps its value in today's money. Each of those is one `anyOf` of the plain form and the object form,
 * so the decimal form's walk reaches the money in both (cli ADR-0047).
 */

const TARGET_GROWTH = growthShape(
	'The yearly step applied to `amount`, whole years from the start of the Timeline. `"inflation"` follows `economy.inflation`, so a target of 3,000.00 THB at the start keeps its value in today\'s money; `{ "bps": 0 }` is a fixed figure.',
)

/** A routing target that keeps its value: the amount, grown by whole years from the Timeline start. */
const grownTarget = (noun: string): Record<string, unknown> => ({
	type: "object",
	description: `The ${noun} as an amount that is grown by whole years from the start of the Timeline (half up each year, as a spending rule's floor is), so it keeps its value in today's money. Without growth, state it as a whole number of minor units.`,
	properties: {
		amount: {
			type: "integer",
			description: `${ROUTED_UNITS} The ${noun} at the start of the Timeline.`,
		},
		growth: TARGET_GROWTH,
	},
	required: ["amount", "growth"],
	additionalProperties: false,
})

/** An `upTo` or a `downTo`: a whole number of minor units, or `{ amount, growth }`. */
const targetShape = (noun: string, plain: string): Record<string, unknown> => ({
	anyOf: [{ type: "integer", description: `${ROUTED_UNITS} ${plain}` }, grownTarget(noun)],
	description: `${plain} A whole number of minor units is nominal and stays what it says; \`{ "amount", "growth" }\` is grown by whole years from the start of the Timeline, so it keeps its value in today's money.`,
})

/** One surplus step. */
const surplusStepShape: Record<string, unknown> = {
	type: "object",
	properties: {
		account: { type: "string", description: "An asset Account this document declares." },
		upTo: targetShape(
			"balance the step fills the Account to",
			"Fill the Account up to this balance, then move to the next step; a capped step needs one after it.",
		),
		share: {
			type: "integer",
			minimum: 1,
			maximum: 10000,
			description: `${BASIS_POINTS} The step takes this share of the money still unrouted when it is reached (floor of the left-over times \`share\` over 10000, never rounded up) and no more than \`upTo\` leaves room for; the rest moves to the next step. 3000 is 30%. Without \`share\` a step takes everything it can. A step with \`share\` cannot be the last step, which takes what is left.`,
		},
	},
	required: ["account"],
	additionalProperties: false,
}

/** One `withdraw` entry: an Account's id, or the Account with a floor. */
const withdrawEntryShape: Record<string, unknown> = {
	anyOf: [
		{ type: "string", description: "An Account's id: it is drawn down to nothing." },
		{
			type: "object",
			description:
				"An Account kept at a Reserve floor: it is drawn only down to `downTo`, then the draw moves on. The money below the floor is never taken, not even to meet a Shortfall.",
			properties: {
				account: { type: "string", description: "An asset Account this document declares." },
				downTo: targetShape(
					"balance kept in the Account",
					"The floor: the Account is drawn only down to this balance.",
				),
			},
			required: ["account", "downTo"],
			additionalProperties: false,
		},
	],
	description:
		"A source a withdrawal draws on: an Account's id, or `{ account, downTo }`. A locked Account is skipped whatever its floor. The same Account may repeat with a lower floor, or plain, later in the list; a floor after a plain entry of the Account, or one not provably lower than the earlier floor, is refused as `WITHDRAW_FLOOR_ORDER`.",
}

/** Where the Scenario's money goes, with the unit of every number it states. */
export const cashflowShape: Record<string, unknown> = {
	type: "object",
	description:
		"Where the scenario's money goes: what is left after spending, what funds each asset, and what pays for withdrawals. Each `surplus` step and `withdraw` entry is addressed by its position in a `--set`, such as `cashflow.surplus.0.share` or `cashflow.withdraw.1.downTo`.",
	properties: {
		surplus: {
			type: "array",
			description:
				"What is left after the month's income and spending, routed in order. It needs at least one step.",
			items: surplusStepShape,
		},
		contribute: {
			type: "array",
			items: { type: "string" },
			description: `The funding priority for asset Contributions (${CONTRIBUTION_CAP}): every asset a contribution Flow targets must appear here, and an extra entry is inert. A liability target is not listed: its Flow is the debt payment.`,
		},
		withdraw: {
			type: "array",
			items: withdrawEntryShape,
			description:
				"The ordered sources a withdrawal draws on: each an Account's id or an Account with a `downTo` floor; a locked Account is skipped.",
		},
	},
	required: ["surplus", "contribute", "withdraw"],
	additionalProperties: false,
}
