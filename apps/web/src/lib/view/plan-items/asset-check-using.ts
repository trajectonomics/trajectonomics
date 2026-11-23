/** The shape checks of keeping a real asset, renting it out and selling it (cli ADR 0060). */
import { parseBps } from "../../format/bps"
import type { AmountDraft, AssetDraft } from "./asset-draft"
import { ROUNDINGS } from "./asset-shape"
import { CATEGORY_PROBLEM, isCategoryText } from "./flow-draft"
import { isDateText, typedAmount } from "./form"

/** A non-negative percent with at most two places: a share of the value, which is never below zero. */
export function isShare(text: string): boolean {
	const bps = parseBps(text)
	return bps !== null && bps >= 0 && !text.trim().startsWith("-")
}

/** The problems of one fixed or computed amount, under its field prefix. */
function amountProblems(
	draft: AmountDraft,
	prefix: string,
	growing: boolean,
	problems: Map<string, string>,
): void {
	if (draft.mode === "percent" && !isShare(draft.rate)) {
		problems.set(`${prefix}.rate`, "Enter a percent with at most two places, such as 1 or 1.50.")
	}
	if (draft.mode !== "amount") return
	if (typedAmount(draft.amount) === null) {
		problems.set(`${prefix}.amount`, "Enter the amount as a decimal number, such as 9000.50.")
	}
	if (growing && draft.growth === "fixed" && parseBps(draft.growthRate) === null) {
		problems.set(
			`${prefix}.growthRate`,
			"Enter a percent with at most two places, such as 3 or 3.50.",
		)
	}
}

/** The amounts the form states, and the rounding that every computed one needs, which has no default. */
function computedProblems(draft: AssetDraft, problems: Map<string, string>): void {
	const selling = draft.selling === "date"
	amountProblems(draft.running, "running", true, problems)
	amountProblems(draft.rent, "rent", true, problems)
	if (selling) amountProblems(draft.saleCost, "saleCost", false, problems)
	const parts = [draft.running, draft.rent, ...(selling ? [draft.saleCost] : [])]
	const rounds = (ROUNDINGS as readonly string[]).includes(draft.rounding)
	if (parts.some((part) => part.mode === "percent") && !rounds) {
		problems.set("rounding", "Choose how an amount computed from the value rounds to a minor unit.")
	}
}

/** The problems of the category, and of the date an owned asset's costs and rent start. */
function keepingProblems(draft: AssetDraft, problems: Map<string, string>): void {
	if (draft.category.trim() !== "" && !isCategoryText(draft.category.trim())) {
		problems.set("category", CATEGORY_PROBLEM)
	}
	const keeps = [draft.running, draft.rent].some((part) => part.mode !== "none")
	if (draft.ownership === "owned" && keeps && !isDateText(draft.from)) {
		problems.set("from", "Enter the date its costs and rent start as YYYY-MM-DD.")
	}
}

/** The problems of the sale's date, which falls after the purchase when the asset is bought. */
function saleProblems(draft: AssetDraft, problems: Map<string, string>): void {
	if (!isDateText(draft.saleDate)) {
		problems.set("saleDate", "Enter the date as YYYY-MM-DD.")
		return
	}
	const bought = draft.ownership === "buy" && isDateText(draft.purchaseDate)
	if (bought && draft.saleDate <= draft.purchaseDate) {
		problems.set("saleDate", "The sale falls after the purchase.")
	}
}

/** The problems of keeping, renting out and selling the asset. */
export function usingProblems(draft: AssetDraft, problems: Map<string, string>): void {
	computedProblems(draft, problems)
	keepingProblems(draft, problems)
	if (draft.selling === "date") saleProblems(draft, problems)
}
