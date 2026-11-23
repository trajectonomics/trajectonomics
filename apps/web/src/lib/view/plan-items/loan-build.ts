/**
 * The parts a loan form saves as, built from its draft (cli ADR 0059). An existing loan keeps its ids and the
 * fields the form does not show; a new one takes its ids from its name.
 */
import {
	type ScenarioAccount,
	type ScenarioFlow,
	scenarioAccount,
	scenarioFlow,
} from "../../contract/scenario-show"
import { parseBps } from "../../format/bps"
import { withoutKeys } from "./form"
import type { LoanParts } from "./loan-document"
import type { LoanDraft } from "./loan-draft"

/** A loan's id, and the ids of its payment and withdrawal, none of which the document already holds. */
export function loanIdOf(base: string, taken: readonly string[]): string {
	for (let index = 1; ; index++) {
		const id = index === 1 ? base : `${base}-${index}`
		if (![id, `${id}-payment`, `${id}-draw`].some((candidate) => taken.includes(candidate)))
			return id
	}
}

/**
 * The liability Account a draft names, or null when `traj`'s schema would refuse it. `base` is the Account the
 * loan keeps the other fields of: its own, or the plan's declaration of the debt it attaches to.
 */
export function accountOf(
	draft: LoanDraft,
	base: ScenarioAccount | undefined,
	id: string,
): ScenarioAccount | null {
	const parsed = scenarioAccount.safeParse({
		...withoutKeys(base ?? {}, ["rate", "compounding"]),
		id,
		kind: "liability",
		rate: parseBps(draft.rate),
		compounding: draft.compounding,
	})
	return parsed.success ? parsed.data : null
}

/** The level Contribution that repays the loan: its amount is the principal, paid in equal payments. */
export function paymentOf(
	draft: LoanDraft,
	existing: LoanParts | undefined,
	id: string,
	key: string,
	principal: string,
): ScenarioFlow | null {
	const parsed = scenarioFlow.safeParse({
		...withoutKeys(existing?.payment ?? {}, [
			"amount",
			"growth",
			"level",
			"frequency",
			"start",
			"target",
		]),
		id: existing?.payment.id ?? `${key}-payment`,
		kind: "contribution",
		target: id,
		frequency: draft.compounding,
		start: draft.firstPayment.trim(),
		level: { principal, payments: Number(draft.payments.trim()), rounding: draft.rounding },
	})
	return parsed.success ? parsed.data : null
}

/** The withdrawal that borrows the principal on the arrival date, or null when it is not valid. */
export function drawOf(
	draft: LoanDraft,
	existing: LoanParts | undefined,
	id: string,
	key: string,
	principal: string,
): ScenarioFlow | null {
	const parsed = scenarioFlow.safeParse({
		id: existing?.draw?.id ?? `${key}-draw`,
		kind: "withdrawal",
		frequency: "once",
		start: draft.arrivalDate.trim(),
		amount: principal,
		growth: { bps: 0 },
		source: id,
	})
	return parsed.success ? parsed.data : null
}
