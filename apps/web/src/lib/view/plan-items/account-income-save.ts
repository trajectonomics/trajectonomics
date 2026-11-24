/** The payout and the fee a form states, over the ones the Account holds, or the problems at its fields (web ADR 0017). */
import { percentText } from "../withdrawals/check"
import {
	type Fee,
	type FeeDraft,
	type IncomeContext,
	kindOf,
	PAYOUT_LABELS,
	type Payout,
	type PayoutDraft,
	payoutUsed,
} from "./account-income"
import { isDateText } from "./form"
import type { Problems } from "./problems"

const RATE_WORDS = "Enter the share as a percent with at most two places, such as 3.5."

/** The problems of a payout draft, at its fields. */
function payoutProblems(draft: PayoutDraft, ctx: IncomeContext): Problems {
	const found: Record<string, string> = {}
	if (percentText(draft.rate) === null) found["payoutRate"] = RATE_WORDS
	if (draft.frequency === "") found["payoutFrequency"] = "Choose how often it is paid."
	if (draft.rounding === "") found["payoutRounding"] = "Choose how each payout rounds."
	if (draft.from === "milestone" && !ctx.milestones.includes(draft.milestone)) {
		found["payoutStart"] = "Choose a Milestone."
	}
	if (draft.from === "anchor" && !ctx.anchors.some((one) => one.value === draft.anchor)) {
		found["payoutStart"] = "Choose a date the household names."
	}
	if (draft.from === "date" && !isDateText(draft.date.trim())) {
		found["payoutStart"] = "Enter the date as YYYY-MM-DD."
	}
	return found
}

/** The label a payout carries: the kind's under a Levy, else the one it had; an unchosen kind keeps a label the form does not write. */
function labelOf(
	draft: PayoutDraft,
	old: Payout | undefined,
	taxed: boolean,
): Record<string, string> {
	const kept = old?.label === undefined ? {} : { label: old.label }
	if (!taxed) return kept
	const label = PAYOUT_LABELS[draft.kind]
	if (label !== undefined) return { label }
	return kindOf(old?.label) === "" ? kept : {}
}

/** The date or Milestone a payout starts at, or none for "now". */
function startOf(draft: PayoutDraft, ctx: IncomeContext): Record<string, string> {
	if (draft.from === "milestone") return { startAt: draft.milestone }
	if (draft.from === "date") return { start: draft.date.trim() }
	const anchor = ctx.anchors.find((one) => one.value === draft.anchor)
	return draft.from === "anchor" && anchor ? { start: anchor.date } : {}
}

const STATED = ["bps", "frequency", "rounding", "start", "startAt", "label"]

/** The payout a draft states over the stored one (its end, end Milestone and prepayments are kept), null for none, or its problems. */
export function payoutFromDraft(
	draft: PayoutDraft,
	old: Payout | undefined,
	ctx: IncomeContext,
): { payout: Payout | null; problems: Problems } {
	if (!payoutUsed(draft)) return { payout: null, problems: {} }
	const problems = payoutProblems(draft, ctx)
	if (Object.keys(problems).length > 0) return { payout: null, problems }
	const kept = Object.fromEntries(
		Object.entries(old ?? {}).filter(([key]) => !STATED.includes(key)),
	)
	const payout = {
		...kept,
		bps: draft.rate.trim(),
		frequency: draft.frequency,
		rounding: draft.rounding,
		...startOf(draft, ctx),
		...labelOf(draft, old, ctx.taxed),
	} as Payout
	return { payout, problems }
}

/** The fee a draft states, null for none, or its problems at its fields. */
export function feeFromDraft(draft: FeeDraft): { fee: Fee | null; problems: Problems } {
	if (draft.rate.trim() === "" && draft.rounding === "") return { fee: null, problems: {} }
	const problems: Record<string, string> = {}
	if (percentText(draft.rate) === null) problems["feeRate"] = RATE_WORDS
	if (draft.rounding === "") problems["feeRounding"] = "Choose how each monthly charge rounds."
	if (Object.keys(problems).length > 0) return { fee: null, problems }
	return { fee: { bps: draft.rate.trim(), rounding: draft.rounding as Fee["rounding"] }, problems }
}
