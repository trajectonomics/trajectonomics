/**
 * One loan as a card on the Assets and debts page: its terms as the document states them, and its statement
 * as `traj` prints it. Every amount is the CLI's decimal string; the card computes nothing.
 */
import type { ProjectionRun, ScenarioDocument, ScenarioFlow } from "../../contract"
import { formatBps } from "../../format/bps"
import { type LoanParts, loanPartsOf } from "./loan-document"
import { type LoanStatement, statementOf } from "./loan-statement"
import type { LoanRow } from "./loans"

/** The words a payment's rounding reads as on a card. */
const ROUNDING_TEXT: Readonly<Record<string, string>> = {
	floor: "Rounded down",
	halfUp: "Rounded to the nearest",
	ceil: "Rounded up",
}

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
		{ label: "Rounding", value: ROUNDING_TEXT[level?.rounding ?? ""] ?? "" },
	]
}

/** The loan cards of a plan, in the order its document holds the loans, each with its statement. */
export function loanCardsOf(doc: ScenarioDocument, run: ProjectionRun | undefined): LoanCardView[] {
	return loanPartsOf(doc).map((loan) => ({
		id: loan.account.id,
		paymentId: loan.payment.id,
		principal: loan.payment.level?.principal ?? "",
		rows: termsOf(loan),
		statement: statementOf(run, loan.account.id),
	}))
}

/** The loan Flows a loan card does not place: a withdrawal or a payment that is not one of a loan's parts. */
export function unplacedFlows(doc: ScenarioDocument): ScenarioFlow[] {
	const placed = new Set(
		loanPartsOf(doc).flatMap((loan) => [
			loan.payment.id,
			...(loan.draw === null ? [] : [loan.draw.id]),
		]),
	)
	return doc.flows.filter((flow) => !placed.has(flow.id))
}
