/**
 * A loan's document parts, and the edits that put them in or take them out of a plan (cli ADR 0059): a
 * liability Account, a level Contribution that repays it, and, when the money arrives on a date, a withdrawal
 * that borrows it. Pure: data in, data out.
 */
import type { ScenarioAccount, ScenarioDocument, ScenarioFlow } from "../../contract/scenario-show"
import { upsert, withAccount, withFlow, without } from "./document"

/** The three parts of one loan: the debt, its payments, and the withdrawal that borrows it, when it has one. */
export interface LoanParts {
	readonly account: ScenarioAccount
	readonly payment: ScenarioFlow
	readonly draw: ScenarioFlow | null
}

/** The loan Flows of a document, the level Contributions into a liability and their withdrawals, in order. */
export function loanPartsOf(doc: ScenarioDocument): LoanParts[] {
	return doc.flows.flatMap((payment): LoanParts[] => {
		if (
			payment.level === undefined ||
			payment.kind !== "contribution" ||
			payment.target === undefined
		) {
			return []
		}
		const account = doc.accounts.find((item) => item.id === payment.target)
		if (account === undefined || account.kind !== "liability") return []
		const draw =
			doc.flows.find((flow) => flow.kind === "withdrawal" && flow.source === account.id) ?? null
		return [{ account, payment, draw }]
	})
}

/** The loan of a document that repays the liability of that id, or undefined. */
export function loanOf(doc: ScenarioDocument, id: string): LoanParts | undefined {
	return loanPartsOf(doc).find((loan) => loan.account.id === id)
}

/** The document with the loan's parts put in, and its withdrawal taken out when the money no longer borrows. */
export function loanDocument(
	doc: ScenarioDocument,
	loan: LoanParts,
	previous: LoanParts | undefined,
): ScenarioDocument {
	const withParts = withFlow(withAccount(doc, loan.account), loan.payment)
	const drawn = previous?.draw ?? null
	const flows =
		drawn !== null && loan.draw === null ? without(withParts.flows, drawn.id) : withParts.flows
	return { ...withParts, flows: loan.draw === null ? flows : upsert(flows, loan.draw) }
}

/** The document without a loan: its Account, and every Flow that pays it, borrows from it or repays it. */
export function withoutLoan(doc: ScenarioDocument, id: string): ScenarioDocument {
	return {
		...doc,
		accounts: doc.accounts.filter((account) => account.id !== id),
		flows: doc.flows.filter((flow) => flow.target !== id && flow.source !== id),
	}
}
