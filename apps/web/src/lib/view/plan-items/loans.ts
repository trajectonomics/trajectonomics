import type { ScenarioFlow } from "../../contract/scenario-show"
import { formatDate } from "../../format"
import { isOnce } from "./flow-dates"
import { growthText } from "./flows"

/** One label and its value as a loan card states them. Every value is the CLI's text. */
export interface LoanRow {
	readonly label: string
	readonly value: string
	/** True when the value is an Account's id, which the page shows by its ledger name. */
	readonly account?: true
}

/**
 * One loan Flow as a read-only card. A withdrawal borrows into its `source`, and a level Contribution
 * repays its `target` in equal payments. The figure the card leads with is a withdrawal's amount per
 * occurrence, or a level loan's principal; it is null when a withdrawal's amount is computed.
 */
export interface LoanCard {
	readonly id: string
	readonly title: string
	readonly amountLabel: string
	readonly amount: string | null
	readonly rows: readonly LoanRow[]
}

/** Whether a Flow is a loan the planner shows read-only: a withdrawal, or a level Contribution. */
export function isLoan(flow: ScenarioFlow): boolean {
	return flow.kind === "withdrawal" || (flow.kind === "contribution" && flow.level !== undefined)
}

/** The dates of a withdrawal as its rows show them: a once withdrawal has one date, "On", and no end; any other runs to the horizon when none is stated. */
function datesOf(flow: ScenarioFlow): LoanRow[] {
	if (isOnce(flow)) return [{ label: "On", value: formatDate(flow.start) }]
	return [
		{ label: "Starts", value: formatDate(flow.start) },
		{ label: "Ends", value: flow.end === undefined ? "To the horizon" : formatDate(flow.end) },
	]
}

/** The rows of a withdrawal: what it borrows from, how often, its dates and its growth. */
function withdrawalRows(flow: ScenarioFlow): LoanRow[] {
	return [
		{ label: "Borrows from", value: flow.source ?? "", account: true },
		{ label: "How often", value: flow.frequency },
		...datesOf(flow),
		{ label: "Growth", value: flow.derive === undefined ? growthText(flow) : "Computed" },
	]
}

/** The rows of a level loan: its lender, its payment count and rounding, how often, and its start. */
function levelRows(flow: ScenarioFlow): LoanRow[] {
	const level = flow.level
	return [
		{ label: "Repays", value: flow.target ?? "", account: true },
		{ label: "Payments", value: level === undefined ? "" : `${level.payments} equal payments` },
		{ label: "Rounding", value: level?.rounding ?? "" },
		{ label: "How often", value: flow.frequency },
		{ label: "Starts", value: formatDate(flow.start) },
	]
}

/** The loan cards of a plan's Flows, in the order the document holds them. */
export function loanCards(flows: readonly ScenarioFlow[]): LoanCard[] {
	return flows.filter(isLoan).map((flow) =>
		flow.level === undefined
			? {
					id: flow.id,
					title: "Withdrawal",
					amountLabel: "Amount per occurrence",
					amount: flow.amount ?? null,
					rows: withdrawalRows(flow),
				}
			: {
					id: flow.id,
					title: "Level loan",
					amountLabel: "Principal",
					amount: flow.level.principal,
					rows: levelRows(flow),
				},
	)
}
