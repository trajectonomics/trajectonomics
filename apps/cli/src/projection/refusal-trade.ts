import type { ErrorCode } from "@trajectonomics/core/sim"
import type { Said } from "./refusal-said"

/**
 * The sentences for buying and selling an asset (sim ADR 0021). They are found by the document check
 * alone, so `scenario apply` and the Store state them too (scenarioDocumentError), as well as
 * `projection run` on a stored row.
 */
export const SAID_TRADE: Readonly<Partial<Record<ErrorCode, Said>>> = {
	WITHDRAWAL_LOCKED: {
		message:
			"A withdrawal sells an asset that is locked on the withdrawal's first date, and no Milestone gate says to wait, so it could never move anything on that date.",
		hint: "Start the withdrawal on or after the asset's lockedUntil, or gate it with startAt on a Milestone.",
	},
	INVALID_FUNDING: {
		message: "A Contribution's funding is none of target, obligation or employer.",
		hint: 'Use "funding": "target", "obligation" or "employer" on a Contribution into an asset.',
	},
	FUNDING_ON_LIABILITY: {
		message:
			"A Contribution into a liability states a funding, and a debt payment is already an obligation.",
		hint: 'Omit "funding" on a Contribution into a liability.',
	},
	OBLIGATION_TARGET_WITHDRAWN: {
		message:
			"An obligation Contribution buys into an Account that cashflow.withdraw lists, so the day's draw could take the price back out of it and the purchase would pay for itself.",
		hint: "Take that Account out of cashflow.withdraw so the purchase is paid from the other Accounts it lists, or buy into an Account the list does not name.",
	},
	EMPLOYER_INTO_LIABILITY: {
		message:
			"An employer Contribution pays into a liability, and the employer's share lands in an asset Account, never in a debt.",
		hint: 'Name a liquid asset Account such as the provident fund as the target, or omit "funding" for a debt payment from your own cashflow.',
	},
	EMPLOYER_INTO_ILLIQUID: {
		message:
			"An employer Contribution pays into an Illiquid asset, and the employer's share lands in a liquid asset Account such as a provident fund.",
		hint: "Name a liquid asset Account as the target.",
	},
}
