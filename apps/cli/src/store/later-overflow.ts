import { type BalanceHistory, LedgerValidationError } from "@trajectonomics/core/ledger"
import type { AppError } from "../errors"
import { ledgerFailure } from "./ledger-errors"

/** One write to an account: its date, what the batch has added to the account by then, and whose it is. */
export type Step = {
	readonly account: { readonly id: string; readonly name: string }
	readonly date: string
	readonly total: bigint
	readonly index: number
}

/** The refusal of the batch's entry at `index`, in the envelope its caller reports. */
export type Overflowed = { index: number; error: AppError }

/** Where a refusal points: the field of the entry at `index` that wrote to the account. */
export type StepPath = (index: number, accountId: string) => string

/** The refusal of the entry whose write begins stretch `at` of an account's writes, if it earns one. */
function refusalOf(
	history: BalanceHistory | undefined,
	steps: readonly Step[],
	at: number,
	path: StepPath,
): Overflowed | undefined {
	const step = steps[at]!
	const next = steps[at + 1]
	if (next?.date === step.date) return undefined
	const found = history?.overflow(step.account.id, step.total, step.date, next?.date, true)
	if (found === undefined) return undefined
	const which = found.date > step.date ? "a later Balance" : "the Balance"
	const error = new LedgerValidationError(
		"AMOUNT_OVERFLOW",
		`balance[${step.account.id}]`,
		found.sum.toString(),
		`${which} of "${step.account.name}" on ${found.date} exceeds the safe integer range`,
	)
	return { index: step.index, error: ledgerFailure(error, path(step.index, step.account.id)) }
}

/**
 * The entries whose write leaves a dated Balance of an account, on the entry's date or later,
 * outside the safe range once every write of the batch is in, and worse than the Ledger left it.
 * `writes` holds each account's writes in date order with the running total the batch has added by
 * each. They cut the account's dates into stretches the batch holds one total over, and the history
 * answers each stretch from the reach it noted once, so an entry costs no scan of the Ledger.
 * A refusal names the account and the first date on which the write leaves the Balance outside the
 * safe range and worse than the Ledger had it, at the entry that began the stretch. An overflow the
 * Ledger already holds on a date, at least as large as the one the write leaves there, is not the
 * entry's, so each date a stretch is judged on is compared with the Ledger's own Balance that day.
 * An entry is refused once, for the first account that earns it.
 */
export function laterOverflows(
	history: BalanceHistory | undefined,
	writes: Iterable<readonly Step[]>,
	path: StepPath,
): Overflowed[] {
	const refused = new Map<number, Overflowed>()
	for (const steps of writes) {
		for (let at = 0; at < steps.length; at++) {
			const index = steps[at]!.index
			if (refused.has(index)) continue
			const refusal = refusalOf(history, steps, at, path)
			if (refusal !== undefined) refused.set(index, refusal)
		}
	}
	return [...refused.values()]
}
