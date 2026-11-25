/**
 * One loan as a card on the Assets and debts page: its terms as the document states them, and its statement
 * as `traj` prints it. Every amount is the CLI's decimal string; the card computes nothing.
 */
import type { Baseline, ProjectionRun, Read, ScenarioDocument } from "../../contract"
import { formatBps } from "../../format/bps"
import { balanceOf } from "./accounts"
import { groupedIds } from "./asset-document"
import { type GroupSwitch, loanSwitch } from "./group-switch"
import { type LoanParts, loanPartsOf } from "./loan-document"
import { type LoanStatement, type LoanTerms, statementOf } from "./loan-statement"
import type { LoanRow } from "./loans"
import { roundingText } from "./rounding-text"

/** One loan's card: its id (the liability Account), its principal, its terms and its statement. */
export interface LoanCardView {
	/** The liability Account's id, which the loan's name is. */
	readonly id: string
	/** The id of the level Contribution that repays the loan, which a what-if switch names. */
	readonly paymentId: string
	/** The amount borrowed, as the document states it: the level payment's principal. */
	readonly principal: string
	/** The loan's terms as text rows: its rate, when it borrows, its payments, its first payment and rounding. */
	readonly rows: readonly LoanRow[]
	readonly statement: LoanStatement
	/** What a What-if switch takes out with the loan: its parts go together, and so does a Try. */
	readonly switch: GroupSwitch
}

/** The rows of a loan's terms, from its document parts alone. */
function termsOf(loan: LoanParts): LoanRow[] {
	const level = loan.payment.level
	return [
		{
			label: "Rate",
			value: `${formatBps(loan.account.rate)}% a year, ${loan.account.compounding ?? "yearly"} interest`,
		},
		{
			label: "Borrowed",
			value: loan.draw === null ? "Already owed (the Baseline holds it)" : `On ${loan.draw.start}`,
		},
		{
			label: "Payments",
			value: `${level?.payments ?? 0} equal ${loan.payment.frequency} payments`,
		},
		{ label: "First payment", value: loan.payment.start },
		{ label: "Rounding", value: roundingText(level?.rounding) },
	]
}

/** What a loan's statement needs of the document: the first payment and the extra payments into the Account. */
function termsOfStatement(doc: ScenarioDocument, loan: LoanParts): LoanTerms {
	return {
		firstPayment: loan.payment.start,
		extras: doc.flows
			.filter(
				(flow) =>
					flow.kind === "contribution" &&
					flow.target === loan.account.id &&
					flow.id !== loan.payment.id,
			)
			.map((flow) => ({ start: flow.start, end: flow.end, frequency: flow.frequency })),
	}
}

/** The loan cards of a plan, in the order its document holds the loans, each with its statement. */
export function loanCardsOf(
	doc: ScenarioDocument,
	run: ProjectionRun | undefined,
	baseline?: Read<Baseline>,
): LoanCardView[] {
	const grouped = groupedIds(doc)
	const held = (id: string) => {
		const account = doc.accounts.find((item) => item.id === id)
		return account !== undefined && balanceOf(account, baseline) !== null
	}
	return loanPartsOf(doc)
		.filter((loan) => !grouped.has(loan.account.id))
		.map((loan) => ({
			id: loan.account.id,
			paymentId: loan.payment.id,
			principal: loan.payment.level?.principal ?? "",
			rows: termsOf(loan),
			statement: statementOf(run, loan.account.id, termsOfStatement(doc, loan)),
			switch: loanSwitch(doc, loan, held),
		}))
}
