/**
 * A routing target as a form states it: the amount text, and how it grows. A target is the amount as typed (growth `none`),
 * an amount that keeps its value in today's money (`inflation`), or one that grows by a fixed percent a year (`fixed`, the
 * rate typed as a percent and written as basis points by text). A `{ bps }` growth the document holds is read into `fixed`, so
 * editing a row never turns it into another growth.
 */
import { formatBps, parseBps } from "../../format"
import { typedAmount } from "../plan-items/form"
import type { Target } from "./entries"

export type GrowthKind = "none" | "inflation" | "fixed"

export interface TargetDraft {
	amount: string
	growth: GrowthKind
	/** The percent a year of a `fixed` growth, as typed. */
	rate: string
}

export const NO_TARGET: TargetDraft = { amount: "", growth: "none", rate: "" }

/** The draft of a stored target. */
export function targetDraftOf(target: Target | undefined): TargetDraft {
	if (target === undefined) return NO_TARGET
	if (typeof target === "string") return { ...NO_TARGET, amount: target }
	if (target.growth === "inflation")
		return { ...NO_TARGET, amount: target.amount, growth: "inflation" }
	return { amount: target.amount, growth: "fixed", rate: formatBps(target.growth.bps) }
}

/** The growth a draft names: its keys over the stored growth's own, or null when a fixed rate is not a percent. */
function growthOf(
	draft: TargetDraft,
	old: Target | undefined,
): Record<string, unknown> | "inflation" | null {
	if (draft.growth === "inflation") return "inflation"
	const bps = parseBps(draft.rate)
	if (bps === null) return null
	const kept = typeof old === "object" && typeof old.growth === "object" ? old.growth : {}
	return { ...kept, bps }
}

/** The target a draft names, sent as the person typed it, or null when the amount or the fixed rate has no shape traj may take. */
export function targetFromDraft(draft: TargetDraft, old: Target | undefined): Target | null {
	const amount = typedAmount(draft.amount)
	if (amount === null) return null
	if (draft.growth === "none") return amount
	const growth = growthOf(draft, old)
	if (growth === null) return null
	const kept = typeof old === "object" ? old : {}
	return { ...kept, amount, growth } as Target
}

export const AMOUNT_WORDS = "Enter the amount as a decimal number, such as 300000."
export const RATE_WORDS = "Enter a percent a year with at most two places, such as 3."

/** The problem at each field of a draft that names no target: the amount, and a fixed growth's rate. */
export function targetProblems(draft: TargetDraft): Record<string, string> {
	const found: Record<string, string> = {}
	if (typedAmount(draft.amount) === null) found["amount"] = AMOUNT_WORDS
	if (draft.growth === "fixed" && parseBps(draft.rate) === null) found["rate"] = RATE_WORDS
	return found
}
