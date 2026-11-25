import type { AmountRow, CurrencyTotal, NetWorth } from "../../contract"
import { formatDate } from "../../format"
import { type AccountNames, NO_NAMES } from "../account-names"
import { assetBars, type CurrencyBar, liabilityRows } from "./composition"

/** What the net worth pages show, derived from one `report networth` Read. */
export interface NetWorthView {
	readonly asOf: string
	readonly totals: readonly CurrencyTotal[]
	/** Set when the As-of is before the first transaction, so the total is not a real reading. */
	readonly note: string | null
	readonly bars: readonly CurrencyBar[]
	readonly liabilities: readonly AmountRow[]
	readonly rows: readonly AmountRow[]
}

/** The view of one `report networth` result: its totals, its composition and every row. */
export function netWorthView(data: NetWorth, names: AccountNames = NO_NAMES): NetWorthView {
	return {
		asOf: formatDate(data.asOf),
		totals: data.totals,
		note: noTransactionsNote(data),
		bars: assetBars(data.rows, names),
		liabilities: liabilityRows(data.rows),
		rows: data.rows,
	}
}

/** The plain statement that the zero is not a real reading, or null when the As-of has transactions. */
export function noTransactionsNote(data: NetWorth): string | null {
	if (!data.noTransactionsBefore) return null
	const asOf = formatDate(data.asOf)
	if (data.firstTransactionDate === null) {
		return `The ledger records no transaction, so the zero at ${asOf} is not a real reading.`
	}
	const first = formatDate(data.firstTransactionDate)
	return `The As-of, ${asOf}, is before the first transaction on ${first}, so the zero is not a real reading.`
}
