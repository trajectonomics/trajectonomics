import { ACCOUNT_RATE_UNITS, PAYOUT_FREQUENCIES } from "./account-terms"
import { prepaymentsShape } from "./flow-parts"
import { DATE, ROUNDINGS } from "./terms"

/*
 * What an asset Account pays out and what it costs (sim ADR 0027, ADR 0028, cli ADR-0067). Both are
 * the engine's own fields and the engine checks them: this says what each key is and in which unit.
 * Every rate is the caller's, and `traj` ships none.
 */

/** How a payout or a fee rounds each amount: required, with no default. */
function rounding(what: string): Record<string, unknown> {
	return {
		enum: [...ROUNDINGS],
		description: `Required, with no default: how ${what} rounds to a minor unit. \`floor\` rounds down, \`halfUp\` to the nearest with a half rounding up, \`ceil\` up.`,
	}
}

/** Assets only: part of the total return paid out as passive income. */
export const payoutShape: Record<string, unknown> = {
	type: "object",
	description:
		"Assets only, and not an illiquid one: a yearly share of the Account's value paid out of it as passive income, such as a dividend or an interest payment. `rate` stays the total return: what is paid out leaves the Account and lands as income that is not earned, and the rest compounds. Omit it and everything is reinvested. A `bps` of 0 is no payout. The share is the caller's own figure: `traj` ships none. Under a Thai Levy, label a payout from a dividend Account `income.section40_4.dividends` and one from interest `income.section40_4.interest`.",
	properties: {
		bps: {
			type: "integer",
			description: `${ACCOUNT_RATE_UNITS} The yearly share of the Account's value paid out, 0 to 10000.`,
		},
		frequency: {
			enum: [...PAYOUT_FREQUENCIES],
			description:
				"The calendar period at whose last day a payout lands, whatever the Timeline's start: `monthly`, `quarterly`, `semiannual` or `annual`. The Calendar shifts a date that is no business day, as it does a Flow's.",
		},
		rounding: rounding("each payout"),
		start: {
			type: "string",
			description: `The first date a payout can land, as ${DATE} The first payout is the first period end on or after it. Omit it and the payout runs from the Timeline's start.`,
		},
		end: {
			type: "string",
			description: `The last date a payout can land, inclusive, as ${DATE} Omit it and the payout runs to the horizon.`,
		},
		startAt: {
			type: "string",
			description:
				"A Milestone's id: the Account pays out only on or after that Milestone's fire date.",
		},
		endAt: {
			type: "string",
			description:
				"A Milestone's id: the Account pays out only strictly before that Milestone's fire date.",
		},
		label: {
			type: "string",
			description:
				"The Tally label a Levy sums each payout under, as on an income Flow; `traj scenario tax` lists them. A payout without one is income no Levy is told about. Needs a Levy, and is refused beside `returnLabel` on the same Account, which would tally the same money twice.",
		},
		prepayments: {
			...prepaymentsShape,
			description:
				"Shares of each payout taken at source, one per Levy, as on an income Flow (for example 10% withheld from a dividend). The withholding is prepaid against the Levy, not lost. Needs a Levy.",
		},
	},
	required: ["bps", "frequency", "rounding"],
	additionalProperties: false,
}

/** Assets only: a yearly share of value charged every month, outside cashflow. */
export const feeShape: Record<string, unknown> = {
	type: "object",
	description:
		"Assets only: a yearly share of the Account's value charged on the last day of every calendar month, such as a fund's yearly fee. It leaves the Account and goes to nobody: it is no expense of the household, never in cashflow, and it applies on every Market path. `rate` stays the return before the fee, and `returnLabel` counts growth net of it. Omit it and nothing is charged. A `bps` of 0 is no fee. The share is the caller's own figure: `traj` ships none.",
	properties: {
		bps: {
			type: "integer",
			description: `${ACCOUNT_RATE_UNITS} The yearly share of the Account's value charged, 0 to 10000, a twelfth of it each month.`,
		},
		rounding: rounding("each monthly charge"),
	},
	required: ["bps", "rounding"],
	additionalProperties: false,
}
