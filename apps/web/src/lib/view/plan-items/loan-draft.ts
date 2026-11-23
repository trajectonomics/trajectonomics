/**
 * A loan as its form holds it, and the document parts it saves as (cli ADR 0059). The page does no money
 * arithmetic: every amount stays the person's text, and `traj` computes the payment, the interest and the
 * balances (web ADR 0002). The parts are in `loan-document.ts`; the checks and the builders are beside it.
 */
import type { ScenarioDocument } from "../../contract/scenario-show"
import { formatBps } from "../../format/bps"
import { accountIds, flowIds } from "./document"
import { slugId, typedAmount } from "./form"
import { accountOf, drawOf, loanIdOf, paymentOf } from "./loan-build"
import { problemsOf } from "./loan-check"
import type { LoanParts } from "./loan-document"
import type { Problems } from "./problems"

/** The text of a loan form. `arrival` is "owed" (the Baseline holds the debt) or "date" (it is borrowed on a date). */
export interface LoanDraft {
	readonly name: string
	readonly principal: string
	readonly rate: string
	readonly compounding: string
	readonly payments: string
	readonly firstPayment: string
	/** "" until the person chooses: a payment has no rounding by default, since it is a money rule they state. */
	readonly rounding: string
	readonly arrival: string
	readonly arrivalDate: string
}

/** The outcome of a loan form: the parts to save, or the problems it shows at its fields. */
export type LoanResult = { ok: true; loan: LoanParts } | { ok: false; problems: Problems }

/** The form's text for a loan to edit, or for a new one, which borrows on a date and is monthly. */
export function loanDraftOf(loan?: LoanParts): LoanDraft {
	const level = loan?.payment.level
	return {
		name: loan?.account.id ?? "",
		principal: level?.principal ?? "",
		rate: loan === undefined ? "" : formatBps(loan.account.rate),
		compounding: loan?.account.compounding ?? "monthly",
		payments: level === undefined ? "" : String(level.payments),
		firstPayment: loan?.payment.start ?? "",
		rounding: level?.rounding ?? "",
		arrival: loan === undefined || loan.draw !== null ? "date" : "owed",
		arrivalDate: loan?.draw?.start ?? "",
	}
}

/**
 * The loan a draft names. A new loan's id is made from its name, and an existing one keeps its ids and the
 * fields the form does not show. The checks are shape checks: `traj` refuses what it cannot accept.
 */
export function loanFromDraft(
	draft: LoanDraft,
	options: { existing?: LoanParts | undefined; doc: ScenarioDocument },
): LoanResult {
	const problems = problemsOf(draft, options.existing === undefined)
	if (problems.size > 0) return { ok: false, problems: Object.fromEntries(problems) }
	const taken = [...accountIds(options.doc), ...flowIds(options.doc)]
	const id = options.existing?.account.id ?? loanIdOf(slugId(draft.name), taken)
	const principal = typedAmount(draft.principal) ?? ""
	const account = accountOf(draft, options.existing, id)
	const payment = paymentOf(draft, options.existing, id, principal)
	const draw = draft.arrival === "date" ? drawOf(draft, options.existing, id, principal) : null
	if (account === null || payment === null || (draft.arrival === "date" && draw === null)) {
		return { ok: false, problems: { general: "The loan cannot be saved as it is." } }
	}
	return { ok: true, loan: { account, payment, draw } }
}
