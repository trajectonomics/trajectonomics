/**
 * Which field of a loan form a `traj` refusal names. A refusal's path is read as the CLI writes it, by the
 * index of the item in its list (`document.flows.3.level.payments`) or by its id (`flows.car-loan.level.payments`),
 * so both forms are matched against where the loan's parts sit in the document the save sent.
 */
import type { ErrorBody, ScenarioDocument } from "../../contract"
import type { LoanParts } from "./loan-document"
import type { Problems, Shown } from "./problems"

/** Where the parts of a loan sit in the document a save sends: each one's id and its index in its list. */
export interface LoanLayout {
	readonly account: { id: string; index: number }
	readonly payment: { id: string; index: number }
	readonly draw: { id: string; index: number } | null
}

/** The layout of a loan in the document it is saved in, so a refusal's path can be read against it. */
export function loanLayoutOf(doc: ScenarioDocument, loan: LoanParts): LoanLayout {
	const at = <T extends { id: string }>(items: readonly T[], id: string) => ({
		id,
		index: items.findIndex((item) => item.id === id),
	})
	return {
		account: at(doc.accounts, loan.account.id),
		payment: at(doc.flows, loan.payment.id),
		draw: loan.draw === null ? null : at(doc.flows, loan.draw.id),
	}
}

/** Whether a path segment names an item: by its id, or by its index in the document's list. */
function namesItem(segment: string | undefined, item: { id: string; index: number }): boolean {
	return segment === item.id || segment === String(item.index)
}

/** The field of a liability Account's path: its rate or its compounding. */
function accountField(
	ref: string | undefined,
	rest: readonly string[],
	layout: LoanLayout,
): string | null {
	if (!namesItem(ref, layout.account)) return null
	const field = rest[0]
	return field === "rate" || field === "compounding" ? field : null
}

/** The field of a payment's path: its level's parts, its start, or its frequency (the compounding). */
function paymentField(rest: readonly string[]): string | null {
	const field = rest[0]
	if (field === "level") {
		const part = rest[1]
		if (rest.length === 1) return "principal"
		return part === "principal" || part === "payments" || part === "rounding" ? part : null
	}
	if (field === "start") return "firstPayment"
	if (field === "frequency") return "compounding"
	return null
}

/** The field of a withdrawal's path: its start is the arrival date, its amount the principal. */
function drawField(rest: readonly string[]): string | null {
	const field = rest[0]
	if (field === "start") return "arrivalDate"
	return field === "amount" ? "principal" : null
}

/** The field of a Flow's path: the payment's or the withdrawal's, by the item it names. */
function flowField(
	ref: string | undefined,
	rest: readonly string[],
	layout: LoanLayout,
): string | null {
	if (namesItem(ref, layout.payment)) return paymentField(rest)
	if (layout.draw !== null && namesItem(ref, layout.draw)) return drawField(rest)
	return null
}

/**
 * The loan form field a refusal names, or null. The path's collection (`flows` or `accounts`) is found
 * wherever it sits, so a `document.` prefix does not matter; the item after it is matched to the loan's parts.
 */
export function loanFieldOfRefusal(error: ErrorBody | null, layout: LoanLayout): string | null {
	const segments = error?.path?.split(".") ?? []
	const at = segments.findIndex((segment) => segment === "flows" || segment === "accounts")
	if (at < 0) return null
	const [collection, ref, ...rest] = segments.slice(at)
	return collection === "accounts" ? accountField(ref, rest, layout) : flowField(ref, rest, layout)
}

/** What a loan form shows: its own problems, and the CLI's refusal at the field its path names. */
export function loanShown(
	problems: Problems,
	refusal: ErrorBody | null,
	message: string | null,
	layout: LoanLayout,
): Shown {
	const refused = loanFieldOfRefusal(refusal, layout)
	const text = message ?? undefined
	return {
		at: (field) => problems[field] ?? (refused === field ? text : undefined),
		general: problems["general"] ?? (refused === null ? text : undefined),
	}
}
