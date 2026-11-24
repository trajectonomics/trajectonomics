import type { ErrorCode } from "@trajectonomics/core/sim"
import type { Said } from "./refusal-said"

/**
 * The sentences for where money goes: a share step and a withdrawal floor (sim ADR 0030). The document
 * check alone finds them, so `scenario apply` and the Store state them too (scenarioDocumentError), as
 * well as `projection run` on a stored row.
 */
export const SAID_ROUTING: Readonly<Partial<Record<ErrorCode, Said>>> = {
	SURPLUS_SHARE_LAST: {
		message:
			"The last surplus step takes a share, and the last step must take everything that is left, so some money would have nowhere to go.",
		hint: 'Remove "share" from the last surplus step, or add a final step with no share and no upTo.',
	},
	WITHDRAW_FLOOR_ORDER: {
		message:
			"A withdrawal entry repeats an Account without a lower floor than the entry before it, or follows an entry that already draws that Account to nothing, so it could never draw anything.",
		hint: "List an Account again only with a lower floor, on the same growth, or plain as the last entry for it.",
	},
}
