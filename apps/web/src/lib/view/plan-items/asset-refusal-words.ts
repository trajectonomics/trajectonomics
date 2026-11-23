/**
 * The refusals a real-asset form can cause, said in plain words at the field that fixes them. `traj` refuses a
 * Scenario document with `invalid_input` whose message is `<path>: <CODE>`, so the sentence is chosen by the CODE
 * (kept in `details` and in the message) and the field by where the path leads (`asset-refusal.ts`).
 */
import type { ErrorBody } from "../../contract"
import type { AssetLayout } from "./asset-refusal"

/** The sentence a refusal is shown as, and the field it belongs to (null for the whole form). */
export interface Worded {
	readonly field: string | null
	readonly text: string
}

const CODES = [
	"NEXT_12_MONTHS_READS_ACCOUNT",
	"END_BEFORE_START",
	"ILLIQUID_ROUTED",
	"OBLIGATION_TARGET_WITHDRAWN",
] as const
type Code = (typeof CODES)[number]

/** The code a refusal carries: the first of its `details` that names one of ours, else one in its message. */
function codeOf(error: ErrorBody): Code | null {
	const details = Array.isArray(error.details) ? (error.details as { code?: unknown }[]) : []
	const named = details.map((detail) => detail?.code)
	return CODES.find((code) => named.includes(code) || error.message.includes(code)) ?? null
}

/** What each code is shown as: the field it belongs to (given the layout and the field its path names) and the text. */
const WORDS: Readonly<Record<Code, (layout: AssetLayout, at: string | null) => Worded | null>> = {
	NEXT_12_MONTHS_READS_ACCOUNT: (layout) => ({
		field: layout.percents[0] ?? null,
		text: "A cost worked out as a percent of this asset's value cannot be used while a Milestone in this plan looks at the next 12 months of expenses. Give the cost as a fixed amount, or change the Milestone.",
	}),
	END_BEFORE_START: (_layout, at) =>
		at === "saleDate"
			? {
					field: "saleDate",
					text: "Sold on is too early: it must fall after the first loan payment and after the month the running costs and rent start.",
				}
			: null,
	ILLIQUID_ROUTED: (layout) => ({
		field: layout.owned ? "ownedAccount" : null,
		text: "The plan's cash-flow routing (withdraw, surplus or contribute) names this asset, and a home or car cannot pay for shortfalls. Take it out of the routing first.",
	}),
	OBLIGATION_TARGET_WITHDRAWN: (layout) => ({
		field: layout.owned ? null : "name",
		text: "The plan's cash-flow routing draws on an account with this name, so the purchase could pay for itself. Choose another name, or take that account out of the routing.",
	}),
}

/** The words of a refusal this form can cause, or null when it is not one of them. `at` is the field its path names. */
export function wordedRefusal(
	error: ErrorBody | null,
	layout: AssetLayout,
	at: string | null,
): Worded | null {
	const code = error === null ? null : codeOf(error)
	return code === null ? null : WORDS[code](layout, at)
}
