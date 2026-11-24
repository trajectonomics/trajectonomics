/** A routing target as a form states it: the amount text, and whether it keeps its value in today's money. */
import { typedAmount } from "../plan-items/form"
import type { Target } from "./entries"

export interface TargetDraft {
	amount: string
	real: boolean
}

export const NO_TARGET: TargetDraft = { amount: "", real: false }

/** The draft of a stored target. */
export function targetDraftOf(target: Target | undefined): TargetDraft {
	if (target === undefined) return NO_TARGET
	if (typeof target === "string") return { amount: target, real: false }
	return { amount: target.amount, real: target.growth === "inflation" }
}

/** The target a draft names, sent as the person typed it, or null when the amount is not a decimal number. */
export function targetFromDraft(draft: TargetDraft, old: Target | undefined): Target | null {
	const amount = typedAmount(draft.amount)
	if (amount === null) return null
	if (!draft.real) return amount
	const kept = typeof old === "object" && old.growth === "inflation" ? old : {}
	return { ...kept, amount, growth: "inflation" }
}

export const AMOUNT_WORDS = "Enter the amount as a decimal number, such as 300000."
