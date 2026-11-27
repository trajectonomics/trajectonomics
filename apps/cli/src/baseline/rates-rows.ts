import { ref } from "../account/view"
import type { AppError } from "../errors"
import { fail } from "../errors"
import type { AccountRow } from "../store"
import { formatMinorUnits, supportedCurrency } from "../store"
import {
	activeMonthsOf,
	frequencyOf,
	leftOutBecauseOf,
	roundBy,
	startOf,
	yearlyCountOf,
} from "./rates-row"
import type { RateRow, RateTotals } from "./rates-view"

/** The currency every read states, as the Baseline mapping does (ADR-0005). */
const CURRENCY = "THB"
const MAX = BigInt(Number.MAX_SAFE_INTEGER)

/** One row and the stated total behind it, so the type totals need not re-read the figure. */
export type StatedRow = { row: RateRow; total: bigint }

/**
 * One Account's row, or null when it had no activity in the covered months. A currency other than
 * THB and a total outside the safe range are refused at the Account's row.
 */
export function statedRowOf(
	account: AccountRow,
	values: readonly bigint[],
	monthKeys: readonly string[],
	asOf: string,
): StatedRow | null | AppError {
	const active = activeMonthsOf(monthKeys, values)
	const head = active[0]
	const tail = active.at(-1)
	if (head === undefined || tail === undefined) return null
	const refused = supportedCurrency(account.currency, `rows.${account.id}`)
	if (refused !== null) return refused
	const raw = values.reduce((sum, value) => sum + value, 0n)
	const total = account.type === "income" ? -raw : raw
	if (total > MAX || total < -MAX) {
		return fail("AMOUNT_OVERFLOW", { path: `rows.${account.id}` })
	}
	const frequency = frequencyOf(monthKeys, active)
	const divisor = BigInt(
		frequency === "yearly" ? yearlyCountOf(monthKeys, active) : monthKeys.length,
	)
	const amount = roundBy(total, divisor)
	const archived = account.archivedAt !== null
	const leftOutBecause = leftOutBecauseOf(archived, amount)
	const row: RateRow = {
		account: ref(account),
		type: account.type === "income" ? "income" : "expense",
		archived,
		firstMonth: head,
		lastMonth: tail,
		monthsWithActivity: active.length,
		total: formatMinorUnits(Number(total), CURRENCY),
		frequency,
		amount: formatMinorUnits(Number(amount), CURRENCY),
		start: startOf(frequency, head.slice(5, 7), asOf),
		inTemplate: leftOutBecause === undefined,
		...(leftOutBecause === undefined ? {} : { leftOutBecause }),
	}
	return { row, total }
}

/** One type's totals, or `AMOUNT_OVERFLOW` when their sum leaves the range the read can state. */
export function totalsOf(
	type: RateTotals["type"],
	total: bigint,
	monthsCovered: number,
): RateTotals | AppError {
	if (total > MAX || total < -MAX) return fail("AMOUNT_OVERFLOW", { path: "totals" })
	const monthly =
		monthsCovered === 0
			? null
			: formatMinorUnits(Number(roundBy(total, BigInt(monthsCovered))), CURRENCY)
	return { type, total: formatMinorUnits(Number(total), CURRENCY), monthly }
}
