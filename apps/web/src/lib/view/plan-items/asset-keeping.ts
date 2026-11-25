/** The running costs and the rent of a real asset (cli ADR 0060): a monthly Flow, as a share of its value or an amount. */
import type { ScenarioFlow } from "../../contract/scenario-show"
import { parseBps } from "../../format/bps"
import { flowFrom, shareFields } from "./asset-build"
import type { AmountDraft, AssetDraft } from "./asset-draft"
import { MONTHLY_DEN } from "./asset-shape"
import { typedAmount } from "./form"

/** The growth a fixed amount states: inflation, or the percent a year the person typed. */
function growthFields(draft: AmountDraft): Record<string, unknown> {
	if (draft.growth !== "fixed") return { growth: "inflation" }
	return { growth: { bps: parseBps(draft.growthRate) } }
}

/** The amount of a monthly running cost or rent: a yearly share of the value, or a fixed amount with its growth. */
function monthlyAmount(
	draft: AmountDraft,
	draftRounding: string,
	account: string,
): Record<string, unknown> {
	if (draft.mode === "percent") return shareFields(draft, draftRounding, MONTHLY_DEN, account)
	return { amount: typedAmount(draft.amount), ...growthFields(draft) }
}

/** The dates of an item that starts when the asset starts to be kept and ends before it is sold. */
function span(start: string, end: string | null): Record<string, unknown> {
	return end === null ? { start } : { start, end }
}

/** Running costs or rent: a monthly Flow from `start` to `end`, an amount stated as the draft says. */
export function keepingFlow(
	kind: "expense" | "income",
	draft: AssetDraft,
	options: {
		id: string
		account: string
		start: string
		end: string | null
		old: ScenarioFlow | null
	},
): ScenarioFlow | null {
	const part = kind === "expense" ? draft.running : draft.rent
	if (part.mode === "none") return null
	const category =
		kind === "expense" && draft.category.trim() !== "" ? { category: draft.category.trim() } : {}
	return flowFrom(options.old, {
		id: options.old?.id ?? options.id,
		kind,
		...(kind === "income" ? { earned: false } : {}),
		frequency: "monthly",
		...span(options.start, options.end),
		...monthlyAmount(part, draft.rounding, options.account),
		...category,
	})
}
