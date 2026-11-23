/**
 * The shape checks of a real-asset form: each text that is not a shape `traj` may take is a problem at its
 * field. A problem of the loan's fields is keyed `loan.<field>`, so it never meets the asset's own `rate`. The CLI
 * checks the rest (cli ADR 0060).
 */
import { isShare, usingProblems } from "./asset-check-using"
import type { AssetDraft } from "./asset-draft"
import { isDateText, slugId, typedAmount } from "./form"
import { problemsOf as loanProblems } from "./loan-check"
import type { LoanDraft } from "./loan-draft"

/** What a check knows besides the draft: whether the asset is new, and the Baseline's assets it may attach to. */
export interface AssetCheck {
	readonly isNew: boolean
	readonly ownedIds: readonly string[]
}

/** The problems of the fields that state the asset and its value. */
function assetProblems(draft: AssetDraft, check: AssetCheck, problems: Map<string, string>): void {
	if (draft.ownership === "owned") {
		if (!check.ownedIds.includes(draft.ownedAccount)) {
			problems.set("ownedAccount", "Choose the asset the Baseline holds.")
		}
	} else if (check.isNew && slugId(draft.name) === "") {
		problems.set("name", "Enter a name for the asset.")
	}
	if (draft.direction !== "rise" && draft.direction !== "fall") {
		problems.set("direction", "Choose whether its value rises or falls each year.")
	}
	if (!isShare(draft.valueRate)) {
		problems.set("valueRate", "Enter a percent with at most two places, such as 3 or 3.50.")
	}
}

/** The problems of the purchase: its date and price, its costs and how it is paid. */
function purchaseProblems(draft: AssetDraft, problems: Map<string, string>): void {
	if (draft.ownership === "owned") return
	if (!isDateText(draft.purchaseDate)) problems.set("purchaseDate", "Enter the date as YYYY-MM-DD.")
	if (typedAmount(draft.price) === null) {
		problems.set("price", "Enter the price as a decimal number, such as 1500000.00.")
	}
	if (draft.buyCost.trim() !== "" && typedAmount(draft.buyCost) === null) {
		problems.set("buyCost", "Enter the costs as a decimal number, or leave them empty.")
	}
	if (draft.paying !== "loan") return
	const loan: LoanDraft = {
		...draft.loan,
		name: "loan",
		arrival: "date",
		arrivalDate: draft.purchaseDate,
	}
	for (const [field, message] of loanProblems(loan, { isNew: false, choices: [] })) {
		if (!["arrivalDate", "name", "owedAccount", "arrival"].includes(field)) {
			problems.set(`loan.${field}`, message)
		}
	}
}

/** Every problem an asset draft has at its fields, keyed by field. */
export function assetProblemsOf(draft: AssetDraft, check: AssetCheck): Map<string, string> {
	const problems = new Map<string, string>()
	assetProblems(draft, check, problems)
	purchaseProblems(draft, problems)
	usingProblems(draft, problems)
	return problems
}
