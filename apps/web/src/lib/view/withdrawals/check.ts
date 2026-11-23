/**
 * The shape checks of a withdrawal form: each text that is not a shape `traj` may take is a problem at its field.
 * The CLI checks the rest, in its own words (cli ADR 0063).
 */
import { isDateText, typedAmount } from "../plan-items/form"
import type { BoundDraft, GuardDraft, WithdrawalDraft } from "./draft"
import { ROUNDINGS } from "./rule"

/** A percent text as `traj --decimal` reads a rate: digits with at most two places. Null when it is not one. */
export function percentText(text: string): string | null {
	const trimmed = text.trim()
	return /^\d+(\.\d{1,2})?$/.test(trimmed) ? trimmed : null
}

const RATE_WORDS = "Enter a percent with at most two places, such as 4 or 4.25."
const AMOUNT_WORDS = "Enter an amount as a decimal number, such as 40000.00."

/** The problem of a floor or a ceiling: an empty amount is none; a typed one needs a shape and its growth. */
function boundProblem(bound: BoundDraft): string | undefined {
	if (bound.amount.trim() === "") return undefined
	if (typedAmount(bound.amount) === null) return AMOUNT_WORDS
	if (bound.growth !== "inflation" && bound.growth !== "fixed")
		return "Choose how it grows each year."
	if (bound.growth === "fixed" && percentText(bound.rate) === null) return RATE_WORDS
	return undefined
}

/** The problem of a guardrail: both parts empty is none; one part alone, or a part that is not a percent, is a problem. */
function guardProblem(guard: GuardDraft): string | undefined {
	const empty = guard.band.trim() === "" && guard.move.trim() === ""
	if (empty) return undefined
	if (percentText(guard.band) === null || percentText(guard.move) === null) {
		return "Enter both how far the share may drift and how far the amount moves, each a percent such as 20 or 10."
	}
	return undefined
}

/** The problems of the steps of rates by date. */
function stepsProblem(draft: WithdrawalDraft): string | undefined {
	for (const step of draft.steps) {
		if (!isDateText(step.from.trim()) || percentText(step.rate) === null) {
			return "Each step needs a date as YYYY-MM-DD and a percent such as 5."
		}
	}
	return undefined
}

type Found = Map<string, string>

/** Records a problem at a field when there is one. */
function put(found: Found, field: string, text: string | undefined): void {
	if (text !== undefined) found.set(field, text)
}

/** Whether a guardrail has anything typed. */
export function hasGuard(guard: GuardDraft): boolean {
	return guard.band.trim() !== "" || guard.move.trim() !== ""
}

const NO_GUARD =
	"Set a cut when the share grows too large, a raise when it grows too small, or both."

/** The problems of a share each year: its steps, its floor and its ceiling. */
function limitProblems(draft: WithdrawalDraft, found: Found): void {
	put(found, "steps", stepsProblem(draft))
	put(found, "floor", boundProblem(draft.floor))
	put(found, "ceiling", boundProblem(draft.ceiling))
}

/** The problems of guardrails: each one typed whole, and at least one of the two. */
function guardrailProblems(draft: WithdrawalDraft, found: Found): void {
	put(found, "upper", guardProblem(draft.upper))
	put(found, "lower", guardProblem(draft.lower))
	if (!hasGuard(draft.upper) && !hasGuard(draft.lower)) put(found, "upper", NO_GUARD)
}

/** The problems of the part of the form only a rule has. */
function ruleProblems(draft: WithdrawalDraft, found: Found): void {
	put(found, "rate", percentText(draft.rate) === null ? RATE_WORDS : undefined)
	const rounded = (ROUNDINGS as readonly string[]).includes(draft.rounding)
	put(found, "rounding", rounded ? undefined : "Choose how each payment rounds to a minor unit.")
	put(
		found,
		"portfolio",
		draft.portfolio.length === 0 ? "Choose at least one Account the rule reads." : undefined,
	)
	if (draft.how === "currentRate") limitProblems(draft, found)
	if (draft.how === "guardrails") guardrailProblems(draft, found)
}

/** The problem of where the rule starts: a Milestone chosen, or a date typed. */
function startProblem(draft: WithdrawalDraft): string | undefined {
	if (draft.startMode === "milestone") {
		return draft.milestone === "" ? "Choose the Milestone the spending starts at." : undefined
	}
	return isDateText(draft.start.trim()) ? undefined : "Enter the start as YYYY-MM-DD."
}

/** The problems a withdrawal draft has at its fields. */
export function problemsOf(draft: WithdrawalDraft): Map<string, string> {
	const found: Found = new Map()
	put(found, "how", draft.how === "" ? "Choose how you spend in retirement." : undefined)
	const paid = draft.frequency === "monthly" || draft.frequency === "annual"
	put(found, "frequency", paid ? undefined : "Choose whether the rule pays monthly or once a year.")
	put(found, "start", startProblem(draft))
	if (draft.how === "level")
		put(found, "amount", typedAmount(draft.amount) === null ? AMOUNT_WORDS : undefined)
	else if (draft.how !== "") ruleProblems(draft, found)
	return found
}
