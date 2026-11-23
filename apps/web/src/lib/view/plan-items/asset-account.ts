/** The Account and the loan of a real asset, built from its draft (cli ADR 0060). */
import { type ScenarioAccount, scenarioAccount } from "../../contract/scenario-show"
import { parseBps } from "../../format/bps"
import type { AssetDraft } from "./asset-draft"
import type { AssetIds } from "./asset-ids"
import { typedAmount, withoutKeys } from "./form"
import { accountOf, drawOf, paymentOf } from "./loan-build"
import type { LoanParts } from "./loan-document"
import type { LoanDraft } from "./loan-draft"

/** The Account: the value's change each year as the Account's own rate, and not liquid. */
export function accountPart(draft: AssetDraft, id: string, base: ScenarioAccount | undefined) {
	const magnitude = draft.valueRate.trim()
	const rate = parseBps(draft.direction === "fall" ? `-${magnitude}` : magnitude)
	const parsed = scenarioAccount.safeParse({
		...withoutKeys(base ?? {}, ["rate", "liquid", "kind"]),
		id,
		kind: "asset",
		rate,
		liquid: false,
	})
	return parsed.success ? parsed.data : null
}

/** The loan the draft finances the purchase with: borrowed on the purchase date, its payments ending before the sale. */
export function loanPart(
	draft: AssetDraft,
	ids: AssetIds,
	old: LoanParts | null,
	end: string | null,
): LoanParts | null {
	if (draft.ownership !== "buy" || draft.paying !== "loan") return null
	const loan: LoanDraft = {
		...draft.loan,
		name: ids.loan,
		arrival: "date",
		arrivalDate: draft.purchaseDate,
	}
	const principal = typedAmount(loan.principal) ?? ""
	const account = accountOf(loan, old?.account, ids.loan)
	const payment = paymentOf(loan, old ?? undefined, ids.loan, ids.loan, principal)
	const draw = drawOf(loan, old ?? undefined, ids.loan, ids.loan, principal)
	if (account === null || payment === null || draw === null) return null
	const ended = end === null ? withoutKeys(payment, ["end"]) : { ...payment, end }
	return { account, payment: ended as LoanParts["payment"], draw }
}
