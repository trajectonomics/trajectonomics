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
import { type OwedChoice, owedChoiceOf } from "./loan-owed"
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
	/** The Scenario id of the debt "I already owe it" attaches to: "" until the person chooses one. */
	readonly owedAccount: string
}

/** The outcome of a loan form: the parts to save, or the problems it shows at its fields. */
export type LoanResult = { ok: true; loan: LoanParts } | { ok: false; problems: Problems }

/** The form's text for when the money arrives: a new loan, or one that borrows on a date, is borrowed on a date. */
function arrivalOf(loan?: LoanParts): Pick<LoanDraft, "arrival" | "arrivalDate" | "owedAccount"> {
	if (loan === undefined || loan.draw !== null) {
		return { arrival: "date", arrivalDate: loan?.draw?.start ?? "", owedAccount: "" }
	}
	return { arrival: "owed", arrivalDate: "", owedAccount: loan.account.id }
}

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
		...arrivalOf(loan),
	}
}

/** The ids a draft's loan takes: the Account it repays, and the key its payment and withdrawal ids start with. */
function idsOf(
	draft: LoanDraft,
	options: { existing?: LoanParts | undefined; doc: ScenarioDocument },
	owed: OwedChoice | undefined,
): { id: string; key: string } {
	const existing = options.existing?.account.id
	const taken = [...accountIds(options.doc), ...flowIds(options.doc)]
	const key = existing ?? loanIdOf(slugId(owed?.name ?? draft.name), taken)
	return { id: existing ?? owed?.id ?? key, key }
}

/**
 * The loan a draft names. A new loan's ids are made from its name, or from the debt's name when the debt is
 * already owed; an existing one keeps its ids and the fields the form does not show. "I already owe it"
 * attaches the loan to the Baseline's debt the person chose (`choices`), so its statement opens at that
 * balance. The checks are shape checks: `traj` refuses what it cannot accept.
 */
export function loanFromDraft(
	draft: LoanDraft,
	options: {
		existing?: LoanParts | undefined
		doc: ScenarioDocument
		choices?: readonly OwedChoice[]
	},
): LoanResult {
	const { existing, doc } = options
	const choices = options.choices ?? []
	const problems = problemsOf(draft, {
		isNew: existing === undefined,
		choices,
		keep: existing?.account.id,
	})
	if (problems.size > 0) return { ok: false, problems: Object.fromEntries(problems) }
	const owed = draft.arrival === "owed" ? owedChoiceOf(choices, draft.owedAccount) : undefined
	const { id, key } = idsOf(draft, options, owed)
	const principal = typedAmount(draft.principal) ?? ""
	const account = accountOf(draft, existing?.account ?? doc.accounts.find((a) => a.id === id), id)
	const payment = paymentOf(draft, existing, id, key, principal)
	const draw = draft.arrival === "date" ? drawOf(draft, existing, id, key, principal) : null
	if (account === null || payment === null || (draft.arrival === "date" && draw === null)) {
		return { ok: false, problems: { general: "The loan cannot be saved as it is." } }
	}
	return { ok: true, loan: { account, payment, draw } }
}
