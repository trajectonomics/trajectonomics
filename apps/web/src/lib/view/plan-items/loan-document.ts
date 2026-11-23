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

/** Whether a Measure graph (a Flow's `derive`) holds an `account` Measure that reads the Account of that id. */
export function readsAccount(node: unknown, id: string): boolean {
	if (Array.isArray(node)) return node.some((item) => readsAccount(item, id))
	if (typeof node !== "object" || node === null) return false
	const record = node as Record<string, unknown>
	if (record["op"] === "account" && record["account"] === id) return true
	return Object.values(record).some((value) => readsAccount(value, id))
}

/** The outcome of taking a loan out of a plan: the document, or the reason it is refused. */
export type LoanRemoval = { ok: true; document: ScenarioDocument } | { ok: false; message: string }

/**
 * The document without a loan: every Flow that pays it, borrows from it or repays it. Its Account goes too,
 * unless the Baseline holds a balance in it (`baselineHolds`): a Baseline row whose Account the document does
 * not declare makes every read fail (UNDECLARED_BALANCE_ACCOUNT), so that Account stays declared. An Account
 * that another Flow's `derive` reads through an `account` Measure is refused by name, never left dangling.
 */
export function withoutLoan(
	doc: ScenarioDocument,
	id: string,
	baselineHolds: boolean,
): LoanRemoval {
	const own = (flow: ScenarioFlow) => flow.target === id || flow.source === id
	const flows = doc.flows.filter((flow) => !own(flow))
	if (baselineHolds) return { ok: true, document: { ...doc, flows } }
	const reader = flows.find((flow) => readsAccount(flow.derive, id))
	if (reader !== undefined) {
		return {
			ok: false,
			message: `The Flow ${reader.id} reads ${id} in its derived amount. Change or delete ${reader.id} first.`,
		}
	}
	return {
		ok: true,
		document: { ...doc, flows, accounts: doc.accounts.filter((a) => a.id !== id) },
	}
}
