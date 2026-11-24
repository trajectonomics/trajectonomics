import type { ErrorCode } from "@trajectonomics/core/sim"
import type { Said } from "./refusal-said"

/**
 * The sentences for a transfer between the plan's own Accounts (sim ADR 0031). The document check alone
 * finds them, so `scenario apply` and the Store state them too (scenarioDocumentError), as well as
 * `projection run` on a stored row.
 */
export const SAID_TRANSFER: Readonly<Partial<Record<ErrorCode, Said>>> = {
	TRANSFER_FROM_ILLIQUID: {
		message:
			"A transfer takes its money from an Illiquid asset, such as a home or a car, which only a withdrawal sells.",
		hint: "Sell the Illiquid asset with a withdrawal Flow, or move money out of a liquid Account instead.",
	},
	TRANSFER_FROM_LIABILITY: {
		message:
			"A transfer takes its money from a liability, and a liability holds no money to move: borrowing is a withdrawal.",
		hint: "Borrow from a liability with a withdrawal Flow, or name an asset Account as the transfer's source.",
	},
	TRANSFER_SAME_ACCOUNT: {
		message:
			"A transfer names the same Account as its source and its target, so it would move nothing.",
		hint: "Name a different Account as the target, or remove the transfer.",
	},
}
