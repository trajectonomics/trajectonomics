import type { Baseline, ProjectionRun, Read, ScenarioDocument } from "../../contract"
import { lensDocument } from "../../what-if/lens-document"
import type { PlanKind } from "../plan-items/kinds"
import { type LoanCardView, loanCardsOf, unplacedFlows } from "../plan-items/loan-card"
import { type LoanCard, loanCards } from "../plan-items/loans"
import type { PlanChanges } from "./plan-items"

/** What a What-if session changes in one loan card: the baseline's text of each term and of the amount borrowed. */
export interface LoanMarks {
	/** The loan is switched off in the session: its card is dimmed and says so. */
	readonly off: boolean
	/** The baseline's amount borrowed, when the session changes it. */
	readonly principal: string | undefined
	/** The baseline's text of each term row the session changes, by the row's label. */
	readonly rows: Readonly<Record<string, string>>
}

/** The marks a loan card with no session has. */
export const NO_LOAN_MARKS: LoanMarks = { off: false, principal: undefined, rows: {} }

/** The loan cards of a page as the what-if holds them, and what the session changes in each, by loan id. */
export interface LoanItems {
	readonly cards: readonly LoanCardView[]
	readonly marks: Readonly<Record<string, LoanMarks>>
}

/** The marks of one loan: its terms' texts that differ between the baseline's card and the what-if's, as the cards show them. */
function marksOf(
	baseline: LoanCardView,
	whatIf: LoanCardView | undefined,
	off: boolean,
): LoanMarks {
	if (whatIf === undefined) return { off, principal: undefined, rows: {} }
	const rows = baseline.rows.flatMap((row) => {
		const now = whatIf.rows.find((item) => item.label === row.label)
		return now !== undefined && now.value !== row.value ? [[row.label, row.value] as const] : []
	})
	return {
		off,
		principal: whatIf.principal === baseline.principal ? undefined : baseline.principal,
		rows: Object.fromEntries(rows),
	}
}

/**
 * The loan cards as the what-if holds them: each loan with the session's Sets put in, and the baseline's text of what
 * changed. A loan the session switched off keeps its stored card, dimmed. The statement is the plan's own, as the
 * session's `projection run` asks for no loan statement.
 */
export function loanItems(
	doc: ScenarioDocument,
	context: { run: ProjectionRun | undefined; baseline: Read<Baseline> | undefined },
	changes: PlanChanges | null,
): LoanItems {
	const baseline = loanCardsOf(doc, context.run, context.baseline)
	if (changes === null) return { cards: baseline, marks: {} }
	const whatIf = loanCardsOf(lensDocument(doc, changes), context.run, context.baseline)
	return {
		cards: baseline.map((card) => {
			const tried = whatIf.find((entry) => entry.id === card.id)
			// The switch is the stored plan's: the session's removals name its paths, whatever a Try makes of the loan.
			return tried === undefined ? card : { ...tried, switch: card.switch }
		}),
		marks: Object.fromEntries(
			baseline.map((card) => [
				card.id,
				marksOf(
					card,
					whatIf.find((entry) => entry.id === card.id),
					changes.removals.includes(`flows.${card.paymentId}`),
				),
			]),
		),
	}
}

/** The loans of the Assets and debts page as the what-if holds them, and the loan Flows no card places, read-only; no other page has any. */
export function loanPage(
	kind: PlanKind,
	doc: ScenarioDocument,
	context: { run: ProjectionRun | undefined; baseline: Read<Baseline> | undefined },
	changes: PlanChanges | null,
): LoanItems & { readonly other: readonly LoanCard[] } {
	if (kind !== "assets") return { cards: [], marks: {}, other: [] }
	return { ...loanItems(doc, context, changes), other: loanCards(unplacedFlows(doc)) }
}
